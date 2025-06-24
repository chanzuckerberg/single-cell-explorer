import { useRef, useEffect, useState, useCallback } from "react";

export const useScrollPreservation = (
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  isLoading: boolean,
  totalBasePairs: number,
  dependencies: string[] = []
) => {
  const savedScrollPosition = useRef<number>(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const [isRestoringScroll, setIsRestoringScroll] = useState(false);
  const [previousDependencies, setPreviousDependencies] = useState<string[]>(
    []
  );

  // Set up scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = (scrollContainerCurrent: HTMLDivElement) => {
      savedScrollPosition.current = scrollContainerCurrent.scrollLeft;
    };

    if (scrollContainer && !isLoading && totalBasePairs > 0) {
      const onScroll = () => handleScroll(scrollContainer);
      scrollContainer.addEventListener("scroll", onScroll);
      return () => scrollContainer.removeEventListener("scroll", onScroll);
    }
    return () => {};
  }, [isLoading, totalBasePairs, scrollContainerRef]);

  // Detect dependency changes
  useEffect(() => {
    const dependenciesChanged =
      previousDependencies.length !== dependencies.length ||
      !previousDependencies.every((dep, index) => dep === dependencies[index]);

    if (dependenciesChanged && previousDependencies.length !== 0) {
      setShouldRestoreScroll(true);
    }

    if (dependenciesChanged) {
      setPreviousDependencies([...dependencies]);
    }
  }, [dependencies, previousDependencies]);

  const restoreScrollPosition = useCallback(() => {
    if (shouldRestoreScroll && scrollContainerRef.current) {
      setIsRestoringScroll(true);
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = savedScrollPosition.current;
          setShouldRestoreScroll(false);
          setIsRestoringScroll(false);
        }
      });
    }
  }, [shouldRestoreScroll, scrollContainerRef]);

  return {
    shouldRestoreScroll,
    isRestoringScroll,
    restoreScrollPosition,
    savedScrollPosition: savedScrollPosition.current,
  };
};
