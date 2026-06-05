"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState("");

  const createTeam = () => {
    const id = crypto.randomUUID();
    router.push(`/team/${id}`);
  };

  const joinTeam = () => {
    const trimmed = joinInput.trim();
    if (!trimmed) return;

    // URLまたはIDからチームIDを抽出
    let teamId = trimmed;
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const teamIdx = parts.indexOf("team");
      if (teamIdx !== -1 && parts[teamIdx + 1]) {
        teamId = parts[teamIdx + 1];
      }
    } catch {
      // URLでない場合はそのままIDとして使う
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      setError("有効なチームIDまたはURLを入力してください");
      return;
    }

    setError("");
    router.push(`/team/${teamId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-800 rounded-2xl mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">タスク管理</h1>
          <p className="text-slate-400 text-sm mt-2">チームで共有できるシンプルなToDoリスト</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {/* 新規作成 */}
          <button
            onClick={createTeam}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新しいチームを作成
          </button>

          {/* 区切り */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">または</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* 参加 */}
          <div className="space-y-2">
            <input
              type="text"
              value={joinInput}
              onChange={e => { setJoinInput(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && joinTeam()}
              placeholder="チームのURLまたはIDを入力"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
            {error && <p className="text-xs text-red-500 px-1">{error}</p>}
            <button
              onClick={joinTeam}
              disabled={!joinInput.trim()}
              className="w-full px-4 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              チームに参加
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          URLを共有するだけでチームメンバーと同期できます
        </p>
      </div>
    </div>
  );
}
