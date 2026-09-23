
const RelocationSite =
    require("../models/RelocationSite");


function calculateDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =
        Math.sin(dLat / 2) ** 2 +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLon / 2) ** 2;


    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}


async function
getRelocationRecommendations(
    habitation
) {

    if (
        !habitation ||
        !habitation.location ||
        !Array.isArray(
            habitation.location.coordinates
        )
    ) {

        return {
            status:
                "LOCATION_MISSING",

            recommendations: []
        };
    }


    const [
        habitationLng,
        habitationLat
    ] =
        habitation.location.coordinates;


    const requiredCapacity =
        Math.max(
            0,
            Number(
                habitation
                    .vulnerablePopulation ||
                0
            )
        );


    const sites =
        await RelocationSite
            .find({
                status: "ACTIVE"
            })
            .lean();


    const recommendations = [];


    for (const site of sites) {

        if (
            !site.location ||
            !Array.isArray(
                site.location.coordinates
            )
        ) {
            continue;
        }


        const [
            siteLng,
            siteLat
        ] =
            site.location.coordinates;


        const total =
            Math.max(
                0,
                Number(
                    site.capacity?.total ||
                    0
                )
            );


        const occupied =
            Math.max(
                0,
                Number(
                    site.capacity?.occupied ||
                    0
                )
            );


        const available =
            Math.max(
                0,
                total - occupied
            );


        /*
         * CRITICAL PS REQUIREMENT:
         *
         * A site cannot be recommended
         * unless it can accommodate the
         * vulnerable population.
         */

        if (
            available <
            requiredCapacity
        ) {
            continue;
        }


        const distanceKm =
            calculateDistanceKm(
                habitationLat,
                habitationLng,
                siteLat,
                siteLng
            );


        recommendations.push({

            siteId:
                site.siteId,

            name:
                site.name,

            distanceKm:
                Number(
                    distanceKm.toFixed(2)
                ),

            suitabilityScore:
                Number(
                    site.suitabilityScore ||
                    0
                ),

            requiredCapacity,

            capacity: {

                total,

                occupied,

                available
            },

            capacitySufficient:
                available >=
                requiredCapacity
        });
    }


    recommendations.sort(
        (a, b) => {

            if (
                b.suitabilityScore !==
                a.suitabilityScore
            ) {

                return (
                    b.suitabilityScore -
                    a.suitabilityScore
                );
            }


            return (
                a.distanceKm -
                b.distanceKm
            );
        }
    );


    return {

        status:
            recommendations.length > 0
                ? "AVAILABLE"
                : "NO_SUFFICIENT_CAPACITY",

        requiredCapacity,

        recommendations
    };
}


module.exports = {

    getRelocationRecommendations
};
