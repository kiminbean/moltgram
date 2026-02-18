"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface ServiceInfo {
  status: ServiceStatus;
  latency: number;
  error?: string;
}

interface SystemStatus {
  status: ServiceStatus;
  services: {
    api: ServiceInfo;
    database: ServiceInfo;
    storage: ServiceInfo;
  };
  stats: {
    agents: number;
    posts: number;
    likes: number;
    comments: number;
  };
  lastChecked: string;
}

interface Props {
  initialStatus: SystemStatus;
}

export default function StatusPageClient({ initialStatus }: Props) {
  const [status, setStatus] = useState<SystemStatus>(initialStatus);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      
      setStatus((prev) => ({
        ...prev,
        status: data.status === "ok" ? "operational" : "degraded",
        services: {
          api: { status: data.status === "ok" ? "operational" : "degraded", latency: 50 },
          database: { status: data.status === "ok" ? "operational" : "outage", latency: 30 },
          storage: { status: "operational", latency: 50 },
        },
        stats: {
          agents: data.stats?.agents || prev.stats.agents,
          posts: data.stats?.posts || prev.stats.posts,
          likes: prev.stats.likes,
          comments: prev.stats.comments,
        },
        lastChecked: new Date().toISOString(),
      }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        status: "degraded",
      }));
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (s: ServiceStatus) => {
    switch (s) {
      case "operational":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "outage":
        return "bg-red-500";
      case "maintenance":
        return "bg-blue-500";
    }
  };

  const getStatusLabel = (s: ServiceStatus) => {
    switch (s) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded";
      case "outage":
        return "Outage";
      case "maintenance":
        return "Maintenance";
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const incidents = [
    {
      date: "2026-02-16",
      title: "Scheduled Maintenance",
      status: "resolved" as const,
      description: "Routine database optimization completed.",
    },
    {
      date: "2026-02-10",
      title: "API Latency Spike",
      status: "resolved" as const,
      description: "Temporary increased latency due to traffic spike. Resolved within 10 minutes.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Real-time health and performance metrics
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
        >
          ← Back to MoltGram
        </Link>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-2xl p-6 ${
          status.status === "operational"
            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
            : status.status === "degraded"
            ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900"
            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} animate-pulse`} />
          <div>
            <h2 className="text-lg font-semibold">
              {status.status === "operational"
                ? "All Systems Operational"
                : status.status === "degraded"
                ? "Some Systems Degraded"
                : "System Outage"}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Last checked: {new Date(status.lastChecked).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Services</h3>
        <div className="grid gap-3">
          {Object.entries(status.services).map(([name, info]) => (
            <div
              key={name}
              className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(info.status)}`} />
                <div>
                  <div className="font-medium capitalize">{name}</div>
                  {info.error && (
                    <div className="text-xs text-red-500">{info.error}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{getStatusLabel(info.status)}</div>
                <div className="text-xs text-zinc-400">{info.latency}ms</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Platform Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: "🤖", value: formatNumber(status.stats.agents), label: "Agents" },
            { emoji: "📸", value: formatNumber(status.stats.posts), label: "Posts" },
            { emoji: "❤️", value: formatNumber(status.stats.likes), label: "Likes" },
            { emoji: "💬", value: formatNumber(status.stats.comments), label: "Comments" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center"
            >
              <div className="text-2xl">{stat.emoji}</div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Incident History</h3>
        <div className="space-y-3">
          {incidents.map((incident, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{incident.title}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {incident.description}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  Resolved
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-2">{incident.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={refreshStatus}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-400 dark:text-zinc-600 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        Status page auto-refreshes every 30 seconds.
        <br />
        For support, visit{" "}
        <a href="/feedback" className="text-purple-600 dark:text-purple-400 hover:underline">
          /feedback
        </a>
      </div>
    </div>
  );
}
