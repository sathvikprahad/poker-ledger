export default function Nav({ view, isAdmin, tab, tabs, onTabChange, onGoAdmin, onGoPublic, onLogout }) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 select-none">
            <span className="text-2xl leading-none">♠</span>
            <h1 className="font-bold text-lg text-green-400 tracking-wide">Poker Tracker</h1>
          </div>

          <div className="flex items-center gap-2">
            {view === 'public' && (
              <button
                onClick={onGoAdmin}
                className="text-sm px-3 py-1.5 rounded border border-gray-700 text-gray-400
                           hover:border-green-700 hover:text-green-400 transition-colors"
              >
                Admin
              </button>
            )}
            {view === 'admin' && (
              <>
                <button
                  onClick={onGoPublic}
                  className="text-sm px-3 py-1.5 rounded border border-gray-700 text-gray-400
                             hover:border-green-700 hover:text-green-400 transition-colors"
                >
                  ← Public
                </button>
                {isAdmin && (
                  <button
                    onClick={onLogout}
                    className="text-sm px-3 py-1.5 rounded bg-red-900/40 text-red-400
                               hover:bg-red-900/70 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {view === 'public' && (
          <div className="flex overflow-x-auto hide-scrollbar -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
