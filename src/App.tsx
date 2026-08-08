import { useEffect, useMemo, useState } from 'react'
import { toast, ToastContainer } from 'react-toastify';
import './App.css';
import ActionBar from './components/ActionBar';
import Overlay from './components/base/Overlay';
import Spinner from './components/base/Spinner';
import Header from './components/Header';
import SpineLoader from './components/SpineLoader';
import { useSettingsStore, useSpineViewerStore } from "./store";
import events from './events';
import { SpineData } from './interfaces';
import "react-toastify/dist/ReactToastify.css";
import { spineEventToast } from './config/toastsConfig';
import AccountScreen from './components/AccountScreen';
import AccountService from './services/AccountService';
import { ViewerAccount } from './interfaces';

function App() {
  const [account, setAccount] = useState<ViewerAccount | null | undefined>(undefined);

  const { filesLoading, loadedFiles, assetLibraryOpen, setMultiple, initAsyncData, reset } = useSpineViewerStore(store => ({
    filesLoading: store.filesLoading,
    loadedFiles: store.loadedFiles,
    assetLibraryOpen: store.assetLibraryOpen,
    setMultiple: store.setMultiple,
    initAsyncData: store.initAsyncData,
    reset: store.reset
  }));

  const canvasBackground = useSettingsStore(store => store.canvasBackground);
  const hasLoadedFiles = useMemo(() => loadedFiles.length > 0, [loadedFiles]);

  useEffect(() => {
    AccountService.getCurrentAccount()
      .then(setAccount)
      .catch(error => {
        toast(`Account storage unavailable: ${error instanceof Error ? error.message : "unknown error"}`, { type: "error" });
        setAccount(null);
      });
  }, []);

  useEffect(() => {
    let disposed = false;
    let service: { init: () => void; dispose: () => void } | null = null;

    if (account && hasLoadedFiles && !assetLibraryOpen) {
      import("./services/PixiService").then(module => {
        if (disposed) return;

        const PixiService = module.default;
        service = new PixiService();
        service.init();
        events.dispatchers.filesLoaded({
          files: loadedFiles,
          canvasBackground: canvasBackground
        });

        document.getElementById("canvas-wrapper")!.style.display = "block";

      }).catch(error => {
        toast(`Unable to initialize Spine renderer: ${error instanceof Error ? error.message : "unknown error"}`, { type: "error" });
      });
    }

    return () => {
      disposed = true;
      service?.dispose();
    }
  }, [loadedFiles, assetLibraryOpen, account]);

  useEffect(() => {
    events.dispatchers.setCanvasBackground(canvasBackground);
  }, [canvasBackground]);

  useEffect(() => {
    const removeSpineCreatedListener = events.handlers.onSpineCreated((spineData: SpineData) => {
      setMultiple({
        animations: spineData.animations,
        skins: spineData.skins
      });
    });

    const removeSpineEventListener = events.handlers.onSpineEvent((spineEventName: string) => {
      toast(spineEventName, spineEventToast);
    });

    return () => {
      removeSpineCreatedListener();
      removeSpineEventListener();
    }
  }, []);

  useEffect(() => {
    initAsyncData();
  }, [])

  const handleLogout = async () => {
    events.dispatchers.destroyPixiApp();
    reset();
    try {
      await AccountService.logout();
    } catch (error) {
      toast(`Unable to log out cleanly: ${error instanceof Error ? error.message : "unknown error"}`, { type: "error" });
    }
    setAccount(null);
  };

  if (account === undefined) {
    return <div className="app"><Header /><Overlay><Spinner /></Overlay><ToastContainer /></div>;
  }

  if (!account) {
    return <div className="app"><Header /><AccountScreen onAuthenticated={setAccount} /><ToastContainer /></div>;
  }

  return (
    <div className="app">
      <Header account={account} onLogout={handleLogout} />
      <div id="canvas-wrapper"></div>
      {filesLoading ? (
        <Overlay>
          <Spinner />
        </Overlay>
      ) : (
        <>
          {hasLoadedFiles && !assetLibraryOpen ? (
            <>
              <ActionBar />
            </>

          ) : (
            <SpineLoader hasCurrentAnimation={hasLoadedFiles} accountId={account.id} />
          )}
        </>

      )}

      <ToastContainer />
    </div>
  )
}

export default App
