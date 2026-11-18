import { useCallback, useEffect, useState } from 'react';
import {
  cancelProjectProcessing,
  getProjectStatus,
  listProjects,
  startProjectProcessing,
  subscribeProjectEvents,
} from './api/client.ts';
import { AccountLibraryView } from './components/AccountLibraryView.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { Header, type AppRoute } from './components/Header.tsx';
import { ProcessingView } from './components/ProcessingView.tsx';
import { ResultsView } from './components/ResultsView.tsx';
import { StudioView } from './components/StudioView.tsx';
import { VideoEditorModal } from './components/VideoEditorModal.tsx';
import type { CaptionStyleId, Clip, Project } from './shared/types.ts';

function readProjectIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('project');
}

function syncProjectIdToUrl(projectId: string | null): void {
  const url = new URL(window.location.href);
  if (projectId) {
    url.searchParams.set('project', projectId);
  } else {
    url.searchParams.delete('project');
  }
  window.history.replaceState({}, '', url.toString());
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>('studio');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [defaultCaptionStyle, setDefaultCaptionStyle] = useState<CaptionStyleId>('dynamic_pop');
  const [defaultFps, setDefaultFps] = useState<number>(30);

  const refreshProjectsList = useCallback(async () => {
    try {
      const list = await listProjects();
      setSavedProjects(list);
    } catch {
      // ignore transient startup errors
    }
  }, []);

  // Restore project on initial mount / page refresh
  useEffect(() => {
    void refreshProjectsList();
    const urlProjectId = readProjectIdFromUrl();
    if (urlProjectId) {
      void getProjectStatus(urlProjectId)
        .then((proj) => {
          setActiveProject(proj);
          if (proj.status === 'processing' || proj.status === 'created') {
            setRoute('processing');
          } else if (proj.status === 'completed' || proj.clips.length > 0) {
            setRoute('results');
          } else {
            setRoute('processing');
          }
        })
        .catch(() => {
          syncProjectIdToUrl(null);
        });
    }
  }, [refreshProjectsList]);

  // Live SSE + fallback polling whenever an active project is processing
  useEffect(() => {
    if (!activeProject) return;
    if (activeProject.status !== 'processing' && activeProject.status !== 'created') {
      return;
    }

    const handleUpdate = (updated: Project) => {
      setActiveProject(updated);
      if (updated.status === 'completed') {
        void refreshProjectsList();
        setRoute('results');
      } else if (updated.status === 'failed' || updated.status === 'cancelled') {
        void refreshProjectsList();
      }
    };

    const unsubscribe = subscribeProjectEvents(activeProject.id, handleUpdate);

    // Fallback poll every 2.5s in case SSE reconnects
    const poll = setInterval(() => {
      void getProjectStatus(activeProject.id).then(handleUpdate).catch(() => {});
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [activeProject?.id, activeProject?.status, refreshProjectsList]);

  const handleProjectStarted = (project: Project) => {
    setActiveProject(project);
    syncProjectIdToUrl(project.id);
    setRoute('processing');
    void refreshProjectsList();
  };

  const handleCancelProcessing = async () => {
    if (!activeProject) return;
    try {
      const updated = await cancelProjectProcessing(activeProject.id);
      setActiveProject(updated);
      void refreshProjectsList();
    } catch {
      // ignore
    }
  };

  const handleRetryProcessing = async () => {
    if (!activeProject) return;
    const restarted = await startProjectProcessing(activeProject.id);
    setActiveProject(restarted);
  };

  const handleNavigate = (nextRoute: AppRoute) => {
    if (nextRoute === 'results' && !activeProject) {
      if (savedProjects.length > 0) {
        const latestDone = savedProjects.find((p) => p.clips.length > 0) ?? savedProjects[0];
        setActiveProject(latestDone);
        syncProjectIdToUrl(latestDone.id);
        setRoute(latestDone.status === 'processing' ? 'processing' : 'results');
        return;
      }
      return;
    }
    if (nextRoute === 'account') {
      void refreshProjectsList();
    }
    setRoute(nextRoute);
  };

  const handleOpenSavedProject = async (proj: Project) => {
    try {
      const fresh = await getProjectStatus(proj.id);
      setActiveProject(fresh);
      syncProjectIdToUrl(fresh.id);
      setRoute(fresh.status === 'processing' ? 'processing' : fresh.clips.length > 0 ? 'results' : 'processing');
    } catch {
      setActiveProject(proj);
      syncProjectIdToUrl(proj.id);
      setRoute(proj.status === 'processing' ? 'processing' : 'results');
    }
  };

  const handleClipUpdated = (updatedClip: Clip) => {
    setActiveProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clips: prev.clips.map((c) => (c.id === updatedClip.id ? updatedClip : c)),
      };
    });
    setEditingClip(null);
  };

  const hasActiveClips = Boolean(
    (activeProject && activeProject.clips.length > 0) ||
      savedProjects.some((p) => p.clips.length > 0),
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#11131c] text-[#e1e1ef]">
      <Header
        route={route}
        hasActiveClips={hasActiveClips}
        onNavigate={handleNavigate}
        onBackFromProcessing={() => setRoute('studio')}
      />

      <main className="flex-1 pt-16">
        {route === 'studio' && (
          <StudioView
            defaultCaptionStyle={defaultCaptionStyle}
            defaultFps={defaultFps}
            onProjectStarted={handleProjectStarted}
          />
        )}

        {route === 'processing' && activeProject && (
          <ProcessingView
            project={activeProject}
            onCancel={handleCancelProcessing}
            onRetry={handleRetryProcessing}
            onViewResults={() => setRoute('results')}
          />
        )}

        {route === 'results' && activeProject && (
          <ResultsView
            project={activeProject}
            onCreateMore={() => {
              syncProjectIdToUrl(null);
              setRoute('studio');
            }}
            onOpenEditor={(clip) => setEditingClip(clip)}
            onClipUpdated={handleClipUpdated}
          />
        )}

        {route === 'account' && (
          <AccountLibraryView
            projects={savedProjects}
            defaultCaptionStyle={defaultCaptionStyle}
            defaultFps={defaultFps}
            onChangeDefaultCaptionStyle={setDefaultCaptionStyle}
            onChangeDefaultFps={setDefaultFps}
            onOpenProject={handleOpenSavedProject}
            onStartNew={() => {
              syncProjectIdToUrl(null);
              setRoute('studio');
            }}
          />
        )}
      </main>

      <BottomNav
        route={route}
        hasActiveClips={hasActiveClips}
        onNavigate={handleNavigate}
      />

      {editingClip && (
        <VideoEditorModal
          clip={editingClip}
          onClose={() => setEditingClip(null)}
          onSaved={handleClipUpdated}
        />
      )}
    </div>
  );
}
