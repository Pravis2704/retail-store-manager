/**
 * Generates unique, human-readable reference IDs
 */

const generateSaleNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `SALE-${dateStr}-${randomSuffix}`;
};

const generateReorderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
};

module.exports = {
  generateSaleNumber,
  generateReorderNumber,
};
