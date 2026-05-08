export interface DataRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  salary: number;
  joiningDate: string;
  country: string;
  status: string;
  score: number;
}

export interface PagedResponse {
  total: number;
  page: number;
  limit: number;
  data: DataRecord[];
}
