import { Server } from "@tus/server";
import express from "express";
import mime from "mime";
import path from "node:path";
import { AzureStore } from "@tus/azure-store";
import { DefaultAzureCredential } from "@azure/identity";

const storageAccount = "samadeoyedev";
const storageContainer = "tusupload";

const uploadApp = express();
const app = express();

const HOST = "0.0.0.0";
const PORT = 1080;

interface Metadata {
  filename: string;
  name: string;
  filetype: string;
}

const getFileNameWithoutExtension = (fileName: string) => {
  const parsedPath = path.parse(fileName);
  const fileNameWithoutExtension = path.join(parsedPath.dir, parsedPath.name);
  return fileNameWithoutExtension;
};

const server = new Server({
  path: "/files",
  datastore: new AzureStore({
    account: storageAccount,
    credential: new DefaultAzureCredential(),
    containerName: storageContainer,
  }),
  maxSize: 250 * 1024 * 1024 * 1024,
  namingFunction: (req, metadata) => {
    const fileExtension = mime.getExtension(metadata?.filetype ?? "");
    const fileName = (metadata as unknown as Metadata)?.filename ?? "";
    return `${Date.now()}-${getFileNameWithoutExtension(fileName)}.${fileExtension}`;
  },
  onUploadFinish: async (req, upload) => {
    console.log(upload);
    return {
      status_code: 200,
      body: JSON.stringify({ message: "Upload finished" }),
    };
  },
});

uploadApp.all("/{*path}", server.handle.bind(server));
app.use("/files", uploadApp);

app.listen(PORT, HOST, () => {
  console.log(`TUS server listening on http://${HOST}:${PORT}/files`);
});
