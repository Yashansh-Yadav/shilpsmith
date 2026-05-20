interface Props {
  title: string;

  value: string;

  subtitle: string;
}

export const DashboardCard = ({
  title,
  value,
  subtitle
}: Props) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <p className="text-slate-500 text-sm">
        {title}
      </p>

      <h2 className="text-4xl font-bold mt-2">
        {value}
      </h2>

      <p className="text-sm text-slate-400 mt-2">
        {subtitle}
      </p>
    </div>
  );
}