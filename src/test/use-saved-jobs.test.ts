import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedJobs } from "@/hooks/use-saved-jobs";

const KEY = "lumofy:saved-jobs";

describe("useSavedJobs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useSavedJobs());
    expect(result.current.savedIds).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isSaved("job-1")).toBe(false);
  });

  it("toggles a job on and persists it to localStorage", () => {
    const { result } = renderHook(() => useSavedJobs());
    act(() => result.current.toggle("job-1"));
    expect(result.current.isSaved("job-1")).toBe(true);
    expect(result.current.count).toBe(1);
    expect(JSON.parse(localStorage.getItem(KEY) || "[]")).toEqual(["job-1"]);
  });

  it("toggles the same job off again", () => {
    const { result } = renderHook(() => useSavedJobs());
    act(() => result.current.toggle("job-1"));
    act(() => result.current.toggle("job-1"));
    expect(result.current.isSaved("job-1")).toBe(false);
    expect(result.current.count).toBe(0);
    expect(JSON.parse(localStorage.getItem(KEY) || "[]")).toEqual([]);
  });

  it("tracks multiple distinct jobs", () => {
    const { result } = renderHook(() => useSavedJobs());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("c"));
    act(() => result.current.toggle("b")); // remove the middle one
    expect(result.current.count).toBe(2);
    expect(result.current.isSaved("a")).toBe(true);
    expect(result.current.isSaved("b")).toBe(false);
    expect(result.current.isSaved("c")).toBe(true);
  });

  it("hydrates initial state from existing localStorage", () => {
    localStorage.setItem(KEY, JSON.stringify(["x", "y"]));
    const { result } = renderHook(() => useSavedJobs());
    expect(result.current.savedIds).toEqual(["x", "y"]);
    expect(result.current.count).toBe(2);
    expect(result.current.isSaved("y")).toBe(true);
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useSavedJobs());
    expect(result.current.savedIds).toEqual([]);
  });

  it("syncs across hook instances in the same tab", () => {
    const a = renderHook(() => useSavedJobs());
    const b = renderHook(() => useSavedJobs());
    act(() => a.result.current.toggle("shared-job"));
    // b listens for the custom change event and re-reads from storage
    expect(b.result.current.isSaved("shared-job")).toBe(true);
    expect(b.result.current.count).toBe(1);
  });
});
