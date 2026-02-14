import { useState, useCallback, useMemo } from "react";
import { useDropzone, type FileWithPath } from "react-dropzone";
import {
  Upload,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import GoldenRetriever from "@uppy/golden-retriever";

const TUS_ENDPOINT = "http://localhost:1080/files";

type FileStatus = "pending" | "uploading" | "complete" | "error";

interface TrackedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: FileStatus;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function HeadlessUppy() {
  const [files, setFiles] = useState<TrackedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const uppy = useMemo(() => {
    const instance = new Uppy({
      restrictions: {
        allowedFileTypes: ["video/*", "image/*"],
      },
      autoProceed: false,
    });

    instance.use(Tus, {
      endpoint: TUS_ENDPOINT,
    });

    instance.use(GoldenRetriever);

    instance.on("upload-progress", (file, progress) => {
      if (!file) return;
      const total = progress.bytesTotal ?? 0;
      const pct =
        total > 0 ? Math.round((progress.bytesUploaded / total) * 100) : 0;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, progress: pct, status: "uploading" } : f,
        ),
      );
    });

    instance.on("upload-success", (file) => {
      if (!file) return;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, progress: 100, status: "complete" } : f,
        ),
      );
    });

    instance.on("upload-error", (file, error) => {
      if (!file) return;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, status: "error", error: error.message }
            : f,
        ),
      );
    });

    instance.on("complete", () => {
      setUploading(false);
    });

    return instance;
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      const added: TrackedFile[] = [];
      for (const file of acceptedFiles) {
        try {
          const ids = uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
            source: "dropzone",
          });
          const uppyFile = uppy.getFile(ids as unknown as string);
          if (uppyFile) {
            added.push({
              id: uppyFile.id,
              name: uppyFile.name ?? file.name,
              size: uppyFile.size ?? file.size,
              progress: 0,
              status: "pending",
            });
          }
        } catch {
          // duplicate or restricted file — skip
        }
      }
      if (added.length > 0) {
        setFiles((prev) => [...prev, ...added]);
      }
    },
    [uppy],
  );

  const removeFile = (id: string) => {
    try {
      uppy.removeFile(id);
    } catch {
      // already removed
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const startUpload = async () => {
    setUploading(true);
    try {
      await uppy.upload();
    } catch {
      setUploading(false);
    }
  };

  const pendingCount = files.filter(
    (f) => f.status === "pending" || f.status === "error",
  ).length;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [], "image/*": [] },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">Upload Files</CardTitle>
          <CardDescription>
            Drag & drop files here, or click to browse. Uploads are resumable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              isDragActive
                ? "border-primary bg-accent/50"
                : "border-border hover:border-muted-foreground/50 hover:bg-accent/30",
            )}
          >
            <input {...getInputProps()} />
            <Upload
              className={cn(
                "mb-3 h-10 w-10",
                isDragActive ? "text-primary" : "text-muted-foreground",
              )}
            />
            {isDragActive ? (
              <p className="text-sm font-medium text-primary">
                Drop files here…
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag & drop files, or click to select
              </p>
            )}
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="overflow-hidden rounded-md border border-border bg-accent/20"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <StatusIcon status={file.status} />
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "uploading" && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {file.progress}%
                        </span>
                      )}
                      {file.status !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {file.status === "uploading" && (
                    <div className="h-1 w-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === "error" && file.error && (
                    <p className="px-3 pb-2 text-xs text-destructive">
                      {file.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {pendingCount > 0 && (
            <button
              type="button"
              disabled={uploading}
              onClick={startUpload}
              className={cn(
                "w-full rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {uploading
                ? "Uploading…"
                : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case "uploading":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
    default:
      return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}
