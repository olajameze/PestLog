import Card from '../ui/Card';

export interface ChemicalUsage {
  id: string;
  chemical: string;
  volumeMl: number;
  status: 'compliant' | 'non-compliant';
  stockRemaining: number;
}

interface ChemicalLogProps {
  chemicalLog: ChemicalUsage[];
  loading: boolean;
  onRowClick: () => void;
}

export default function ChemicalLog({ chemicalLog, loading, onRowClick }: ChemicalLogProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Chemical log</p>
          <h3 className="text-xl font-semibold text-navy">Recent usage & stock alerts</h3>
        </div>
        <button type="button" onClick={onRowClick} className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
          View details
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading chemical usage…</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Chemical</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {chemicalLog.length === 0 ? (
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No chemical or product lines recorded in this period. Log treatments and products on jobs to populate this table.
                  </td>
                </tr>
              ) : (
                chemicalLog.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{item.chemical}</td>
                    <td className="px-4 py-3 text-slate-600">{item.volumeMl} ml</td>
                    <td className="px-4 py-3 text-slate-600">{item.stockRemaining}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'compliant' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
