import { API_BASE_URL } from "../config/api";

const DEFAULT_TIMEOUT = 30000;

async function fetchWithTimeout(url, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout / 1000}s`, { cause: err });
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/analyze`, {
    method: "POST",
    body: formData,
    timeout: 60000,
  });

  const data = await res.json();
  return data.task_id;
}

export async function pollResults(taskId) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/results/${taskId}`, {
    timeout: 15000,
  });

  const data = await res.json();
  return data;
}
