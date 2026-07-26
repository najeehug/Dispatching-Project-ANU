import clsx from 'clsx';

const STATUS = {
  PENDING_PIN:      { label: 'Pending pin',      cls: 'bg-gray-100 text-gray-600'    },
  PIN_REQUESTED:    { label: 'Pin requested',     cls: 'bg-amber-100 text-amber-700'  },
  PIN_SET:          { label: 'Pin set',           cls: 'bg-blue-100 text-blue-700'    },
  AT_CUSTOMS:       { label: 'At customs',        cls: 'bg-orange-100 text-orange-700'},
  CUSTOMS_CLEARED:  { label: 'Customs cleared',   cls: 'bg-teal-100 text-teal-700'   },
  ASSIGNED:         { label: 'Driver assigned',   cls: 'bg-indigo-100 text-indigo-700'},
  OUT_FOR_DELIVERY: { label: 'Out for delivery',  cls: 'bg-emerald-100 text-emerald-700'},
  DELIVERED:        { label: 'Delivered',         cls: 'bg-green-100 text-green-700'  },
  FAILED_DELIVERY:  { label: 'Failed delivery',   cls: 'bg-red-100 text-red-700'     },
};

export default function StatusBadge({ status, className }) {
  const cfg = STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cfg.cls, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}
