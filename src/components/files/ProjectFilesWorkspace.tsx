"use client";

import { useState } from "react";
import { FileUploadPanel } from "./FileUploadPanel";
import { ProjectFileList } from "./ProjectFileList";

interface ProjectFilesWorkspaceProps {
  projectId: string;
}

export function ProjectFilesWorkspace({ projectId }: ProjectFilesWorkspaceProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
      <FileUploadPanel
        projectId={projectId}
        onUploaded={() => setRefreshKey((current) => current + 1)}
      />
      <ProjectFileList key={refreshKey} projectId={projectId} />
    </div>
  );
}
