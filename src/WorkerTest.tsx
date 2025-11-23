import { useEffect, useRef, useState, type FC, type FormEvent } from "react";

export const WorkerTest: FC = () => {
  const [value, setValue] = useState("");
  const worker = useRef<Worker>(null);

  const submitHandler = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !worker.current) return;
    // При submit-е формы отправляем в worker сообщение
    worker.current.postMessage({ value });
    setValue("");
  };

  useEffect(() => {
    //СоздаемWorker
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });

    //Вешаем слушатель на сообщения отWorker
    worker.current.addEventListener("message", function (data) {
      console.log("data: ", this, data);
    });

    // При демонтировании обязательно убиваем worker для
    // того что бы избежать утечек памяти
    return () => {
      worker.current?.terminate();
    };
  }, []);
  return (
    <div className="worker">
      <form onSubmit={submitHandler}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    </div>
  );
};
