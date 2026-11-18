import type {
  CaptionStyleId,
  Clip,
  ClipRegeneratePayload,
  Project,
  UrlInspectionResult,
} from '../shared/types.ts';

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function inspectUrl(url: string): Promise<UrlInspectionResult> {
  const res = await fetch('/api/projects/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return parseJsonOrThrow<UrlInspectionResult>(res);
}

export async function createProjectFromUrl(opts: {
  url: string;
  title?: string;
  captionStyle?: CaptionStyleId;
  fps?: number;
}): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const data = await parseJsonOrThrow<{ project: Project }>(res);
  return data.project;
}

export async function uploadVideoProject(opts: {
  file: File;
  title?: string;
  captionStyle?: CaptionStyleId;
  fps?: number;
  onProgress?: (pct: number) => void;
}): Promise<Project> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', opts.file);
    if (opts.title) formData.append('title', opts.title);
    if (opts.captionStyle) formData.append('captionStyle', opts.captionStyle);
    if (opts.fps) formData.append('fps', String(opts.fps));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/projects/upload');

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && json.project) {
          resolve(json.project as Project);
        } else {
          reject(new Error(json.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading video.'));
    xhr.send(formData);
  });
}

export async function startProjectProcessing(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/process`, { method: 'POST' });
  const data = await parseJsonOrThrow<{ project: Project }>(res);
  return data.project;
}

export async function cancelProjectProcessing(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/cancel`, { method: 'POST' });
  const data = await parseJsonOrThrow<{ project: Project }>(res);
  return data.project;
}

export async function getProjectStatus(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/status`);
  const data = await parseJsonOrThrow<{ project: Project }>(res);
  return data.project;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  const data = await parseJsonOrThrow<{ projects: Project[] }>(res);
  return data.projects;
}

export async function getClipDetails(
  clipId: string,
): Promise<{ clip: Clip; sourceDurationSec: number }> {
  const res = await fetch(`/api/clips/${clipId}`);
  return parseJsonOrThrow<{ clip: Clip; sourceDurationSec: number }>(res);
}

export async function regenerateClipApi(
  clipId: string,
  payload: ClipRegeneratePayload,
): Promise<Clip> {
  const res = await fetch(`/api/clips/${clipId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonOrThrow<{ clip: Clip }>(res);
  return data.clip;
}

export function subscribeProjectEvents(
  projectId: string,
  onUpdate: (project: Project) => void,
): () => void {
  const es = new EventSource(`/api/projects/${projectId}/events`);
  es.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as Project;
      onUpdate(parsed);
    } catch {
      // ignore keepalive/malformed
    }
  };
  return () => {
    es.close();
  };
}

/**
 * Reliable file download helper tested across desktop & Android Chrome browsers.
 * Uses a direct navigation-safe anchor download without popups.
 */
export function triggerFileDownload(url: string, fallbackName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fallbackName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
