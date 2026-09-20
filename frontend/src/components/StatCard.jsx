import { motion } from "framer-motion";

export default function StatCard({
    title,
    value,
    icon,
    description,
}) {
    const Icon = icon;

    return (
        <motion.div
            className="stat-card"
            whileHover={{ y: -4 }}
        >
            <div className="stat-card-icon">
                <Icon size={22} />
            </div>

            <div className="stat-card-content">
                <p className="stat-card-title">
                    {title}
                </p>

                <h2 className="stat-card-value">
                    {value}
                </h2>

                <p className="stat-card-description">
                    {description}
                </p>
            </div>
        </motion.div>
    );
}