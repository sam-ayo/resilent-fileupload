import { useState, useMemo } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/react/dashboard";
import Tus from "@uppy/tus";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import "./App.css";
import GoldenRetriever from "@uppy/golden-retriever";

const TUS_ENDPOINT = "http://localhost:1080/files";

interface CompletedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  completedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function App() {
  const [completedFiles, setCompletedFiles] = useState<CompletedFile[]>([]);

  const uppy = useMemo(() => {
    const instance = new Uppy({
      restrictions: {
        allowedFileTypes: ["video/*", "image/*"],
      },
      autoProceed: false,
    });

    instance.use(Tus, {
      endpoint: TUS_ENDPOINT,
      chunkSize: 10 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      removeFingerprintOnSuccess: true,
    });

    instance
      .on("upload-success", (file, response) => {
        if (!file) return;
        setCompletedFiles((prev) => [
          ...prev,
          {
            name: file.name ?? "unknown",
            size: file.size ?? 0,
            type: file.type ?? "unknown",
            url: response.uploadURL ?? "",
            completedAt: new Date().toLocaleTimeString(),
          },
        ]);
      })
      .use(GoldenRetriever);

    return instance;
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Resilient File Upload</h1>
        <p className="subtitle">
          Powered by{" "}
          <a href="https://tus.io" target="_blank" rel="noreferrer">
            TUS protocol
          </a>{" "}
          — resumable, fault-tolerant uploads for large files. Close the
          browser, lose connection, refresh the page — your uploads pick up
          right where they left off.
        </p>
      </header>

      <main>
        <Dashboard
          uppy={uppy}
          proudlyDisplayPoweredByUppy={false}
          hideProgressDetails={false}
          height={450}
          width="100%"
          theme="dark"
          note="Videos and images only. Uploads are resumable — safe to close and reopen."
        />

        {completedFiles.length > 0 && (
          <section className="completed">
            <h2>Completed Uploads ({completedFiles.length})</h2>
            <div className="completed-list">
              {completedFiles.map((f, i) => (
                <div key={i} className="completed-item">
                  <div className="completed-info">
                    <span className="completed-name">{f.name}</span>
                    <span className="completed-meta">
                      {formatBytes(f.size)} · {f.type} · {f.completedAt}
                    </span>
                  </div>
                  <span className="completed-check">✓</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
