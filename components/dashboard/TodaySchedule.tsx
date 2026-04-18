import Card from '../ui/Card';

export interface TechnicianLocation {
  label: string;
  status: 'completed' | 'pending';
  xPercent: number;
  yPercent: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  address: string;
  time: string;
  status: 'completed' | 'pending';
  technician: string;
  locationLabel: string;
}

interface TodayScheduleProps {
  schedule?: {
    appointments: Appointment[];
    completed: number;
    scheduled: number;
    percentComplete: number;
    locations: TechnicianLocation[];
  };
  loading: boolean;
  onMapClick: () => void;
}

export default function TodaySchedule({ schedule, loading, onMapClick }: TodayScheduleProps) {
  const appointments = schedule?.appointments ?? [];
  const percent = schedule?.percentComplete ?? 0;

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Today’s schedule</p>
          <h3 className="text-xl font-semibold text-navy">Jobs completed vs scheduled</h3>
        </div>
        <div className="text-right text-sm text-slate-500">
          {loading ? 'Loading…' : `${schedule?.completed ?? 0}/${schedule?.scheduled ?? 0} jobs`}
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-slate-500">{percent}% complete today</p>

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-3xl border border-zinc-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{appointment.clientName}</p>
                <p className="text-sm text-slate-600">{appointment.address}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {appointment.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-600">
              <span>{appointment.time}</span>
              <span>{appointment.technician}</span>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={onMapClick} className="group w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary-300 hover:bg-white">
        <div className="relative h-48 overflow-hidden rounded-3xl bg-slate-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.14),_transparent_35%)]" />
          {(schedule?.locations ?? []).map((location, index) => (
            <span
              key={`${location.label}-${index}`}
              className={`absolute inline-flex h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${location.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ left: `${location.xPercent}%`, top: `${location.yPercent}%` }}
            />
          ))}
        </div>
        <div className="mt-3 text-sm text-slate-600">
          Tap to view fleet locations. Pins reflect today&apos;s jobs and completion status (approximate layout).
        </div>
      </button>
    </Card>
  );
}
