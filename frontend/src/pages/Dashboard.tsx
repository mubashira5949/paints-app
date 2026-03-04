export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
      <p className="mt-4 text-muted-foreground">
        Welcome to your Paints App Dashboard. Select an item from the sidebar to
        begin.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder Stat Cards */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6"
          >
            <h3 className="tracking-tight text-sm font-medium">Metric {i}</h3>
            <p className="text-2xl font-bold mt-2">1,234</p>
            <p className="text-xs text-muted-foreground mt-1">
              +12% from last month
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
