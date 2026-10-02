"use client";

import { Component, type ReactNode } from "react";

/** Keeps sibling home sections alive if one client island throws. */
export class SectionErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: boolean }
> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null;
    return this.props.children;
  }
}
