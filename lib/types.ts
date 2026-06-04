export type Todo = {
  id: string;
  team_id: string;
  category_id: string | null;
  text: string;
  done: boolean;
  done_at: string | null;
  order_index: number;
  created_at: string;
};

export type Category = {
  id: string;
  team_id: string;
  name: string;
  color: string;
  order_index: number;
};
