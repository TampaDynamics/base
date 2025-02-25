// app/page.tsx

import { revalidatePath } from "next/cache";
import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";
import Logout from "@/components/Logout";
import Chat from "@/components/Chat";

async function App() {
  
  const user = await AuthGetCurrentUserServer();
  
  const { data: todos } = await cookiesClient.models.Todo.list();

  async function addTodo(data: FormData) {
    "use server";
    const title = data.get("title") as string;
    await cookiesClient.models.Todo.create({
      content: title,
      done: false,
      priority: "medium",
    });
    revalidatePath("/");
  }

  return (
    <div className="flex justify-center h-screen">
      <div>
      <h1>Hello, {user?.userId} 👋</h1>
      {user && <Logout />}
      <form action={addTodo}>
        <input type="text" name="title" />
        <button type="submit">Add Todo</button>
      </form>

      <ul>
        {todos && todos.map((todo) => <li key={todo.id}>{todo.content}</li>)}
      </ul>
      </div>
      <Chat />
    </div>
  );
}

export default App;