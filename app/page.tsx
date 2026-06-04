"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");

  const createTeam = () => {
    const id = crypto.randomUUID();
    router.push(`/team/${id}`);
  };

  const joinTeam = () => {
    const val = joinId.trim();
    if (!val) return;
    const match = val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (match) router.push(`/team/${match[0]}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">タスク管理</h1>
          <p className="text-slate-500 text-sm">チームで共有できるシンプルなToDoリスト</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <button
            onClick={createTeam}
            className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            新しいチームを作成
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">または</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinTeam()}
              placeholder="チームのURLまたはIDを入力"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
            <button
              onClick={joinTeam}
              disabled={!joinId.trim()}
              className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              チームに参加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
