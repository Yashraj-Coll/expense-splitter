import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export function getError(err) {
  if (err.response && err.response.status >= 500) {
    return 'Something went wrong on the server. Please try again.';
  }
  if (err.response && err.response.data && err.response.data.message) {
    return err.response.data.message;
  }
  if (err.response) {
    return 'Something went wrong on the server. Please try again.';
  }
  return 'Cannot connect to the server. Please check that it is running.';
}
export default API;
