import {
  ShieldCheck,
  CreditCard,
  FlaskConical,
  ChevronRight,
} from "lucide-react";

export default function GovernmentSchemes() {
  const schemes = [
    {
      title: "PM Fasal Bima Yojana (PMFBY)",
      desc: "Crop insurance scheme for farmers",
      status: "Eligible",
      icon: <ShieldCheck className="text-green-600" size={26} />,
      iconBg: "bg-green-100",
    },
    {
      title: "Kisan Credit Card (KCC)",
      desc: "Get easy credit for your farming needs",
      status: "Eligible",
      icon: <CreditCard className="text-blue-600" size={26} />,
      iconBg: "bg-blue-100",
    },
    {
      title: "Soil Health Card Scheme",
      desc: "Free soil testing and health report",
      status: "Eligible",
      icon: <FlaskConical className="text-orange-600" size={26} />,
      iconBg: "bg-orange-100",
    },
  ];

  if (schemes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">Government Schemes for You</h2>
        <div className="flex flex-col items-center justify-center text-center py-10 text-slate-500">
          <span className="text-4xl mb-3">🌱</span>
          <p className="font-semibold">No government schemes available right now.</p>
          <p className="text-sm mt-2">Check back soon for new opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-[1.15rem] font-semibold text-slate-900">
          Government Schemes for You
        </h2>

        <button className="text-green-700 font-semibold hover:underline text-sm">
          View All
        </button>
      </div>

      <div className="space-y-3">

        {schemes.map((scheme) => (

          <div
            key={scheme.title}
            className="flex items-center justify-between border border-slate-200/80 rounded-2xl p-4 hover:shadow-sm transition duration-300 cursor-pointer"
          >

            <div className="flex items-center gap-4">

              <div className={`${scheme.iconBg} rounded-2xl p-3`}> 
                {scheme.icon}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {scheme.title}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {scheme.desc}
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                {scheme.status}
              </span>

              <ChevronRight
                size={20}
                className="text-gray-400"
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}