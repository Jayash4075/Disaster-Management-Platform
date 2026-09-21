const getShelterStatus = (capacity, currentOccupancy) => {
    if (!capacity || capacity === 0) return 'unknown';
    const occupancyRate = currentOccupancy / capacity;

    if (occupancyRate >= 1) return 'full';
    if (occupancyRate >= 0.8) return 'almost-full';
    return 'available';
};

module.exports = getShelterStatus;