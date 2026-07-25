const API_BASE_URL = "http://localhost:3000/api";

export async function createMonitor(monitor) {
  const response = await fetch(`${API_BASE_URL}/monitors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(monitor)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to create monitor");
  }

  console.log(response);

  return result.data;
  
}

export async function getMonitors() {
  const response = await fetch(`${API_BASE_URL}/monitors`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to load monitors");
  }

  return result.data;
}

export async function deleteMonitor(id) {
  const response = await fetch(`${API_BASE_URL}/monitors/${id}`, {
    method: "DELETE"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to delete monitor");
  }

  return result.data;
}