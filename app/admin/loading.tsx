export default function AdminLoading() {
  return <div className="animate-in" aria-label="Загрузка раздела">
    <div className="skeleton h-3 w-32 rounded-full" /><div className="skeleton mt-3 h-10 w-64 max-w-[75%] rounded-xl" /><div className="skeleton mt-3 h-4 w-[min(100%,560px)] rounded-full" />
    <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card p-4"><div className="skeleton size-10 rounded-xl" /><div className="skeleton mt-5 h-7 w-14 rounded-lg" /><div className="skeleton mt-3 h-3 w-24 max-w-full rounded-full" /></div>)}</div>
    <div className="card mt-6 p-5"><div className="skeleton h-5 w-36 rounded-full" /><div className="mt-6 space-y-5">{Array.from({ length: 3 }, (_, index) => <div key={index}><div className="skeleton mb-2 h-3 w-40 rounded-full" /><div className="skeleton h-2 w-full rounded-full" /></div>)}</div></div>
  </div>;
}
