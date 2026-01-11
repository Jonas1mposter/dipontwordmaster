import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, X, ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "success" | "error" | "warn";
  message: string;
}

interface MatchDebugPanelProps {
  enabled?: boolean;
}

// Global log storage
let globalLogs: LogEntry[] = [];
let logId = 0;
let listeners: Set<() => void> = new Set();

// Export function to add logs from anywhere
export const addMatchDebugLog = (
  message: string,
  type: "info" | "success" | "error" | "warn" = "info"
) => {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  
  const entry: LogEntry = {
    id: ++logId,
    timestamp,
    type,
    message,
  };
  
  globalLogs = [...globalLogs.slice(-99), entry]; // Keep last 100 logs
  listeners.forEach(listener => listener());
  
  // Also log to console for debugging
  const consoleMethod = type === "error" ? console.error : 
                        type === "warn" ? console.warn : 
                        console.log;
  consoleMethod(`[MatchDebug] ${message}`);
};

// Clear logs
export const clearMatchDebugLogs = () => {
  globalLogs = [];
  listeners.forEach(listener => listener());
};

export const MatchDebugPanel = ({ enabled = false }: MatchDebugPanelProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateLogs = () => setLogs([...globalLogs]);
    listeners.add(updateLogs);
    updateLogs(); // Initial sync
    
    return () => {
      listeners.delete(updateLogs);
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  if (!enabled) return null;

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "warn": return "text-yellow-400";
      default: return "text-blue-300";
    }
  };

  const getTypePrefix = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "✓";
      case "error": return "✗";
      case "warn": return "⚠";
      default: return "→";
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-black/80 border-purple-500/50 text-purple-300 hover:bg-purple-900/50"
      >
        <Bug className="w-4 h-4 mr-1" />
        调试
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-black/95 border border-purple-500/50 rounded-lg shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/30 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-200">匹配调试日志</span>
          <span className="text-xs text-purple-400/60">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 text-purple-300 hover:text-purple-100 hover:bg-purple-800/50"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0 text-purple-300 hover:text-purple-100 hover:bg-purple-800/50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <>
          <ScrollArea className="h-48" ref={scrollRef}>
            <div className="p-2 space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-purple-400/50 text-center py-4">
                  暂无日志...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-purple-500/60 shrink-0">{log.timestamp}</span>
                    <span className={`shrink-0 ${getTypeColor(log.type)}`}>
                      {getTypePrefix(log.type)}
                    </span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-purple-500/30 bg-purple-900/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMatchDebugLogs}
              className="h-7 text-xs text-purple-300 hover:text-purple-100 hover:bg-purple-800/50"
            >
              清除日志
            </Button>
            <span className="text-xs text-purple-400/50">
              点击右上角 × 隐藏
            </span>
          </div>
        </>
      )}
    </div>
  );
};
