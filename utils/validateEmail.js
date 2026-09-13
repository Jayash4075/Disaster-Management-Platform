const dns = require('dns').promises;

exports.isDomainValid = async (email) => {
  const domain = email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
     console.log(`MX check for ${domain}:`, mxRecords);
    return mxRecords && mxRecords.length > 0;
  } catch {
    console.log(`MX check FAILED for ${domain}:`, err.message); 
    return false;
  }
};