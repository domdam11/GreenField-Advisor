import { api } from "./axiosInstance";

// Upload avatar utente
export async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post("/api/utenti/me/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; 
}

// Upload immagine pianta
export async function uploadPlantImage(plantId, file) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post(`/api/piante/${plantId}/image`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; 
}


