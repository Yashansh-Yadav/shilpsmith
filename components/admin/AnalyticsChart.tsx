"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const data = [
    {
        name: "Mon",
        inquiries: 4
    },
    {
        name: "Tue",
        inquiries: 7
    },
    {
        name: "Wed",
        inquiries: 12
    },
    {
        name: "Thu",
        inquiries: 9
    }
];

export const AnalyticsChart = () => {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm h-[400px]">
            <h2 className="text-xl font-bold mb-6">
                Inquiry Analytics
            </h2>

            <ResponsiveContainer
                width="100%"
                height="100%"
            >
                <LineChart data={data}>
                    <XAxis dataKey="name" />

                    <YAxis />

                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey="inquiries"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}