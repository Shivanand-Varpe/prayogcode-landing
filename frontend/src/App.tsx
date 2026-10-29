import { useState, useEffect, useCallback } from "react";
import { CompilerWorkspace } from "./components/CompilerWorkspace";
import { LandingPage } from "./components/LandingPage";
import { resolveRouteView, type RouteView } from "./utils/landingLogic";

function App() {
  const [view, setView] = useState<RouteView>(() =>
    resolveRouteView(window.location.pathname, window.location.search)
  );
  const [selectedSnippetCode, setSelectedSnippetCode] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const handlePopState = () => {
      setView(
        resolveRouteView(window.location.pathname, window.location.search)
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToCompiler = useCallback((initialCode?: string) => {
    if (initialCode) {
      setSelectedSnippetCode(initialCode);
    }
    window.history.pushState({}, "", "/compiler");
    setView("COMPILER");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const navigateToHome = useCallback(() => {
    window.history.pushState({}, "", "/");
    setView("LANDING");
  }, []);

  if (view === "COMPILER") {
    return (
      <CompilerWorkspace
        initialCode={selectedSnippetCode}
        onNavigateHome={navigateToHome}
      />
    );
  }

  return <LandingPage onStartCoding={navigateToCompiler} />;
}

export default App;