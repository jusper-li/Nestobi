do $$
begin
  if (select count(*) from public.coffee_quiz_questions) > 0 then
    return;
  end if;

  insert into public.coffee_quiz_questions (question_text, image_url, display_order, is_active)
  values
    ('什麼情境下你會想喝咖啡？', '/images/coffee-quiz/1.avif', 1, true),
    ('對於精品咖啡的了解程度？', '/images/coffee-quiz/2.avif', 2, true),
    ('飲食的口味和習慣？', '/images/coffee-quiz/3.avif', 3, true),
    ('平時喝咖啡的習慣？', '/images/coffee-quiz/4.avif', 4, true),
    ('綜合果汁中不想加入的水果？', '/images/coffee-quiz/5.avif', 5, true),
    ('哪一種味道對你來說無法接受？', '/images/coffee-quiz/6.avif', 6, true),
    ('到手搖飲料店買手搖飲，覺得喝幾分糖才好喝呢？', '/images/coffee-quiz/7.avif', 7, true),
    ('過往喝咖啡最不好的經驗？', '/images/coffee-quiz/8.avif', 8, true),
    ('怎麼決定一杯咖啡的好壞？', '/images/coffee-quiz/9.avif', 9, true),
    ('嚐到下列哪個味道時，你會有最不舒服感覺？', '/images/coffee-quiz/10.avif', 10, true),
    ('你的年齡？', '/images/coffee-quiz/14.avif', 11, true),
    ('你的性別？', '/images/coffee-quiz/14.avif', 12, true);

  with q as (
    select id, display_order from public.coffee_quiz_questions
  )
  insert into public.coffee_quiz_question_options (question_id, option_key, option_text, score, display_order)
  select q.id, v.option_key, v.option_text, v.score, v.display_order
  from q
  join (
    values
      (1,'A','需要提神時',1,1),(1,'B','每天都要來一杯時',1,2),(1,'C','待在一個地方的時候',1,3),(1,'D','情緒需要抒發的時候',1,4),
      (2,'A','沖煮、處理法、風味落點瞭若指掌',1,1),(2,'B','有一定了解，包含烘焙度和產地等等',1,2),(2,'C','懂一些，都選推薦款或是喝習慣的口味',1,3),(2,'D','完全沒概念或是剛接觸',1,4),
      (3,'A','濃郁調味明顯的料理',1,1),(3,'B','口味多變，多方嘗試',1,2),(3,'C','清新淡雅的飲食',1,3),(3,'D','原型食物，品嚐最真實的味道',1,4),
      (4,'A','吃飯時',1,1),(4,'B','抽菸時',1,2),(4,'C','咖啡搭配甜點、餅乾',1,3),(4,'D','喜歡單獨品飲咖啡',1,4),
      (5,'A','檸檬',1,1),(5,'B','莓果',1,2),(5,'C','香蕉',1,3),(5,'D','西瓜',1,4),
      (6,'A','酸味',1,1),(6,'B','苦味',1,2),(6,'C','煙燻味',1,3),(6,'D','香料味',1,4),
      (7,'A','全糖',1,1),(7,'B','7分糖',1,2),(7,'C','3分糖',1,3),(7,'D','1分糖或無糖',1,4),
      (8,'A','喝咖啡後心悸',1,1),(8,'B','喝了一口覺得好苦',1,2),(8,'C','滿心期待喝了卻覺得沒什麼味道',1,3),(8,'D','很酸，完全喝不完',1,4),
      (9,'A','香氣，要讓我喜歡才好',1,1),(9,'B','口感，喝起來的質地',1,2),(9,'C','風味，有層次變化的風味',1,3),(9,'D','尾韻，嚥下後留在嘴裡的餘韻',1,4),
      (10,'A','酸',1,1),(10,'B','甜',1,2),(10,'C','苦',1,3),(10,'D','鹹',1,4),
      (11,'A','22歲以下',0,1),(11,'B','23至30歲',0,2),(11,'C','31至40歲',0,3),(11,'D','41歲以上',0,4),
      (12,'A','女性',0,1),(12,'B','男性',0,2),(12,'C','不透露',0,3),(12,'D','不透露',0,4)
  ) as v(display_order_question, option_key, option_text, score, display_order)
    on v.display_order_question = q.display_order;
end $$;
