// вешаем слушатель на получаемые сообщения
self.onmessage = (e) => {
  const data = e.data;
  console.log("log from worker: ", data);
  // Отправляем сообщения в ответ
  self.postMessage({ data });
};
