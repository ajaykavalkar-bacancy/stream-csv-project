const FIRST_NAMES = [
  'John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Linda',
  'Robert', 'Patricia', 'William', 'Jennifer', 'Richard', 'Elizabeth',
  'Joseph', 'Barbara', 'Thomas', 'Susan', 'Charles', 'Jessica'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'];
const COUNTRIES = ['USA', 'India', 'UK', 'Germany', 'Canada', 'Australia'];
const STATUSES = ['Active', 'Inactive', 'Pending'];

function randomDate(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const ts = startMs + Math.random() * (endMs - startMs);
  return new Date(ts).toISOString().slice(0, 10);
}

function generateRow(i) {
  return {
    id: i,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName: LAST_NAMES[i % LAST_NAMES.length],
    email: `user${i}@example.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    salary: 40000 + Math.floor(Math.random() * 100001),
    joiningDate: randomDate('2015-01-01', '2024-12-31'),
    country: COUNTRIES[i % COUNTRIES.length],
    status: STATUSES[i % STATUSES.length],
    score: parseFloat((Math.random() * 100).toFixed(2))
  };
}

function getPagedData(page, limit, total) {
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(startIdx + limit - 1, total);
  const data = [];
  for (let i = startIdx; i <= endIdx; i++) {
    data.push(generateRow(i));
  }
  return { total, page, limit, data };
}

module.exports = { generateRow, getPagedData, randomDate };
