const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Ollama } = require('ollama');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 初始化Ollama客户端
const ollama = new Ollama();

// 添加一个健壮的JSON解析函数
function parseAIResponse(content) {
  // 极简健壮策略：先直接解析，失败就抛异常
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('AI响应内容无法解析为标准JSON');
  }
}

// 基础路由
app.get('/', (req, res) => {
  res.json({ message: '足球青训管理系统后端服务' });
});

// 球员管理接口
app.get('/api/players', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    res.json(players);
  } catch (error) {
    console.error('读取球员数据失败:', error);
    res.status(500).json({ error: '读取球员数据失败' });
  }
});

app.post('/api/players', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    
    const newPlayer = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    players.push(newPlayer);
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
    
    res.json({ success: true, player: newPlayer });
  } catch (error) {
    console.error('添加球员失败:', error);
    res.status(500).json({ error: '添加球员失败' });
  }
});

app.put('/api/players/:id', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    
    const playerIndex = players.findIndex(p => p.id === req.params.id);
    if (playerIndex === -1) {
      return res.status(404).json({ error: '球员不存在' });
    }
    
    players[playerIndex] = { ...players[playerIndex], ...req.body, updatedAt: new Date().toISOString() };
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
    
    res.json({ success: true, player: players[playerIndex] });
  } catch (error) {
    console.error('更新球员失败:', error);
    res.status(500).json({ error: '更新球员失败' });
  }
});

app.delete('/api/players/:id', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    
    const filteredPlayers = players.filter(p => p.id !== req.params.id);
    fs.writeFileSync('players.json', JSON.stringify(filteredPlayers, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除球员失败:', error);
    res.status(500).json({ error: '删除球员失败' });
  }
});

// 教练管理接口
app.get('/api/coaches', (req, res) => {
  try {
    const coachesData = fs.readFileSync('coaches.json', 'utf8');
    const coaches = JSON.parse(coachesData);
    res.json(coaches);
  } catch (error) {
    console.error('读取教练数据失败:', error);
    res.status(500).json({ error: '读取教练数据失败' });
  }
});

app.post('/api/coaches', (req, res) => {
  try {
    const coachesData = fs.readFileSync('coaches.json', 'utf8');
    const coaches = JSON.parse(coachesData);
    
    const newCoach = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    coaches.push(newCoach);
    fs.writeFileSync('coaches.json', JSON.stringify(coaches, null, 2));
    
    res.json({ success: true, coach: newCoach });
  } catch (error) {
    console.error('添加教练失败:', error);
    res.status(500).json({ error: '添加教练失败' });
  }
});

// 球员注册接口
app.post('/api/player/register', (req, res) => {
  try {
  const player = req.body;
  let players = [];
    if (fs.existsSync('players.json')) {
      players = JSON.parse(fs.readFileSync('players.json', 'utf8'));
  }
    
  // 检查姓名+电话唯一性
  if (players.some(p => p.name === player.name && p.phone === player.phone)) {
    return res.status(400).json({ error: '该小将已注册' });
  }
    
    const newPlayer = {
      id: Date.now().toString(),
      ...player,
      createdAt: new Date().toISOString()
    };
    
    players.push(newPlayer);
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
    
    res.json({ success: true, player: newPlayer });
  } catch (error) {
    console.error('球员注册失败:', error);
    res.status(500).json({ error: '球员注册失败' });
  }
});

// 教练入驻接口
app.post('/api/coach/register', (req, res) => {
  try {
  const coach = req.body;
  let coaches = [];
    if (fs.existsSync('coaches.json')) {
      coaches = JSON.parse(fs.readFileSync('coaches.json', 'utf8'));
  }
    
  // 检查姓名+俱乐部唯一性
  if (coaches.some(c => c.name === coach.name && c.club === coach.club)) {
    return res.status(400).json({ error: '该教练已入驻' });
  }
    
    const newCoach = {
      id: Date.now().toString(),
      ...coach,
      createdAt: new Date().toISOString()
    };
    
    coaches.push(newCoach);
    fs.writeFileSync('coaches.json', JSON.stringify(coaches, null, 2));
    
    res.json({ success: true, coach: newCoach });
  } catch (error) {
    console.error('教练入驻失败:', error);
    res.status(500).json({ error: '教练入驻失败' });
  }
});

// 登录接口
app.post('/api/login', (req, res) => {
  try {
  const { role, name, password } = req.body;
    let dataFile = '';
    
  if (role === 'player') {
      dataFile = 'players.json';
  } else if (role === 'coach') {
      dataFile = 'coaches.json';
  } else {
    return res.status(400).json({ error: '身份类型错误' });
  }
    
  let users = [];
    if (fs.existsSync(dataFile)) {
      users = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
    
  const user = users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
    
    res.json({ success: true, role, name: user.name });
    } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 文件上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    res.json({ 
      success: true, 
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// AI功能接口

// 训练计划生成
app.post('/api/ai/training-plan', async (req, res) => {
  try {
    const { age, level, goals, trainingYears, specialGoals, availableTime } = req.body;
    
    // 移除年龄相关日志
    console.log('训练计划生成请求参数:', { level, goals, trainingYears, specialGoals, availableTime });
    
    const dailyMinutes = Math.round((parseInt(availableTime) || 5) * 60 / 7);
    const prompt = `
你是一名专业青训足球教练，请根据以下球员的具体情况制定科学、个性化的训练计划。

球员信息：
- 当前水平：${level || '未知'}
- 训练年限：${trainingYears || '未知'}年
- 训练目标：${goals || '未知'}
- 司职位置：${specialGoals || '无'}
- 每周可用训练时间：${availableTime || '未知'}小时

重要时间限制要求（必须严格遵守）：
- 每周总训练时间必须严格等于${availableTime}小时（${availableTime * 60}分钟）
- 训练时间平均分配到7天，基础每天${Math.floor((availableTime * 60) / 7)}分钟，余数随机分配
- 每天都必须有训练内容，不设置休息日
- 每个训练日的内容必须包含具体时间，格式为"训练内容：X分钟"

训练目标针对性要求：
${goals ? goals.split(/[，,、]/).map(goal => {
  const goalMap = {
    '射门技术': '- 射门技术：必须安排射门练习、射门技巧训练、射门力量训练、射门准确性训练',
    '传球技术': '- 传球技术：必须安排传球练习、传球准确性训练、传球技巧训练、传球力量控制',
    '控球技术': '- 控球技术：必须安排控球练习、控球技巧训练、控球稳定性训练、转身突破',
    '防守技术': '- 防守技术：必须安排防守练习、防守站位训练、防守技巧训练、拦截训练',
    '体能': '- 体能：必须安排体能训练、耐力训练、力量训练、爆发力训练',
    '速度': '- 速度：必须安排速度训练、爆发力训练、敏捷性训练、反应速度训练',
    '战术理解': '- 战术理解：必须安排战术训练、战术分析、战术执行、阵型理解',
    '团队配合': '- 团队配合：必须安排团队训练、配合练习、团队战术、沟通训练',
    '改善传球技术': '- 传球技术：必须安排传球练习、传球准确性训练、传球技巧训练、传球力量控制'
  };
  return goalMap[goal.trim()] || `- ${goal.trim()}：根据目标制定针对性训练内容`;
}).join('\n') : '- 综合训练：全面提升基础技能'}

司职位置专项要求：
${specialGoals ? (() => {
  const positionMap = {
    '前锋': '- 前锋：必须安排射门练习、跑位训练、进攻配合、射门技巧、门前嗅觉训练',
    '中场': '- 中场：必须安排传球练习、控球训练、战术理解、组织进攻、视野训练',
    '后卫': '- 后卫：必须安排防守练习、防守站位、防守技巧、防守配合、头球训练',
    '门将': '- 门将：必须安排扑救练习、门将技术、门将反应、门将指挥、手抛球训练'
  };
  return positionMap[specialGoals] || `- ${specialGoals}：根据位置特点制定专项训练`;
})() : '- 综合位置：全面提升各位置技能'}

训练计划要求：
1. trainingGoals字段必须直接使用用户输入的训练目标，不要输出"具体目标1/2/3"这类占位词
2. focusAreas字段必须结合训练目标和司职位置，生成高度相关的专项内容，不要输出"重点专项1/2"这类占位词
3. 每一天的训练内容都必须与训练目标或司职位置强相关，不能输出与目标无关的内容
4. 每天都必须有训练内容，不设置休息日
5. 训练时间要具体到分钟，且符合时间分配要求
6. 总训练时间必须严格等于${availableTime}小时，不能超出或不足
7. 训练时间平均分配到7天，基础每天${Math.floor((availableTime * 60) / 7)}分钟，余数随机分配
8. 每个训练日的内容格式必须为"具体训练内容：X分钟"
9. specialAdvice字段必须根据训练目标和司职位置生成具体的专项建议，不要输出"专项建议1/2"这类占位词

请严格按照以下JSON格式输出，不要添加任何其他内容：
{
  "trainingGoals": ["${goals ? goals.split(/[，,、]/).map(g => g.trim()).join('", "') : '提升基础技能'}"],
  "weeklySchedule": {
    "monday": "具体训练内容：X分钟",
    "tuesday": "具体训练内容：X分钟", 
    "wednesday": "具体训练内容：X分钟",
    "thursday": "具体训练内容：X分钟",
    "friday": "具体训练内容：X分钟",
    "saturday": "具体训练内容：X分钟",
    "sunday": "具体训练内容：X分钟"
  },
  "focusAreas": ["具体专项1", "具体专项2"],
  "intensity": "中等",
  "specialAdvice": ["具体建议1", "具体建议2"],
  "notes": "训练计划：每周训练7天，每天约X分钟，总训练时长X分钟"
}

重要提醒：
1. 必须严格按照上述JSON格式输出
2. 训练内容必须与输入的训练目标和司职位置高度相关
3. 总训练时间必须严格等于${availableTime}小时
4. 训练时间平均分配到7天，基础每天${Math.floor((availableTime * 60) / 7)}分钟，余数随机分配
5. 每天都必须有训练内容，不设置休息日
6. 每个训练日的内容格式必须为"具体训练内容：X分钟"
7. 不要输出任何占位词，必须生成实质性内容
8. 所有字符串必须用双引号包围
9. 确保JSON格式完全正确，可以被直接解析
`;

    const ollamaClient = new Ollama();
    const response = await ollamaClient.chat({
      model: 'qwen2:0.5b',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log('AI响应内容:', response.message.content);

    let trainingPlan;
    
    // 简化的JSON解析策略：直接尝试解析，失败则使用默认计划
    try {
      // 直接尝试解析AI响应
      trainingPlan = parseAIResponse(response.message.content);
      console.log('AI响应解析成功:', trainingPlan);
      
      // 验证和清理数据格式
      trainingPlan = {
        trainingGoals: Array.isArray(trainingPlan.trainingGoals) ? trainingPlan.trainingGoals : [],
        weeklySchedule: typeof trainingPlan.weeklySchedule === 'object' ? trainingPlan.weeklySchedule : {},
        focusAreas: Array.isArray(trainingPlan.focusAreas) ? trainingPlan.focusAreas : [],
        intensity: typeof trainingPlan.intensity === 'string' ? trainingPlan.intensity : '中等',
        specialAdvice: Array.isArray(trainingPlan.specialAdvice) ? trainingPlan.specialAdvice : [],
        notes: typeof trainingPlan.notes === 'string' ? trainingPlan.notes : ''
      };
      
      // 处理weeklySchedule，只在内容完全缺失时才补充
      const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const allUserGoals = [goals, specialGoals].filter(Boolean).flatMap(s => s.split(/[，,、]/).map(x => x.trim())).filter(Boolean);
      
      // 计算每天训练时间（平均分配到7天，处理余数）
      const availableTimeNum = parseInt(availableTime) || 5;
      const totalTrainingMinutes = availableTimeNum * 60; // 总训练分钟数
      const baseDailyMinutes = Math.floor(totalTrainingMinutes / 7); // 基础每天分钟数
      const remainingMinutes = totalTrainingMinutes % 7; // 剩余分钟数
      
      // 随机选择一天来分配剩余分钟数
      const extraMinutesDay = Math.floor(Math.random() * 7);
      
      console.log('时间分配:', { 
        availableTimeNum, 
        totalTrainingMinutes, 
        baseDailyMinutes,
        remainingMinutes,
        extraMinutesDay
      });
      
      weekDays.forEach((day, idx) => {
        // 计算当天的训练分钟数
        const dailyMinutes = idx === extraMinutesDay ? baseDailyMinutes + remainingMinutes : baseDailyMinutes;
        
        // 只在内容完全缺失或为空时才补充
        if (!trainingPlan.weeklySchedule[day] || trainingPlan.weeklySchedule[day].trim() === '') {
          const goal = allUserGoals[idx % allUserGoals.length] || '综合训练';
          trainingPlan.weeklySchedule[day] = `${goal}：${dailyMinutes}分钟`;
        } else {
          // 如果AI返回的内容没有时间，添加时间
          const content = trainingPlan.weeklySchedule[day];
          if (!content.includes('分钟')) {
            trainingPlan.weeklySchedule[day] = `${content}：${dailyMinutes}分钟`;
          }
        }
      });
      
      // 移除休息日设置，确保每天都有训练内容
      // weekDays.forEach((day, idx) => {
      //   if (idx >= trainingDays) {
      //     trainingPlan.weeklySchedule[day] = "休息或轻度活动";
      //   }
      // });
      
      // 处理notes字段，确保是字符串
      if (Array.isArray(trainingPlan.notes)) {
        trainingPlan.notes = trainingPlan.notes.map(n => typeof n === 'string' ? n : JSON.stringify(n)).join('；');
      }
      
      // 更新notes字段，确保包含正确的时间信息
      if (!trainingPlan.notes || trainingPlan.notes.includes('X分钟')) {
        const baseDailyMinutes = Math.floor((availableTimeNum * 60) / 7);
        trainingPlan.notes = `训练计划：每周训练7天，每天约${baseDailyMinutes}分钟，总训练时长${availableTimeNum * 60}分钟`;
      }
      
      // 后处理：替换占位符为实际内容
      console.log('开始后处理占位符替换...');
      if (trainingPlan.focusAreas) {
        console.log('处理前的focusAreas:', trainingPlan.focusAreas);
        trainingPlan.focusAreas = trainingPlan.focusAreas.map(area => {
          if (area.includes('重点专项') || area.includes('具体专项')) {
            console.log('发现占位符:', area);
            // 根据训练目标和司职位置生成实际内容
            const actualAreas = [];
            if (goals) {
              actualAreas.push(...goals.split(/[，,、]/).map(g => g.trim()));
            }
            if (specialGoals) {
              actualAreas.push(specialGoals);
            }
            const replacement = actualAreas.length > 0 ? actualAreas[0] : '基础技能训练';
            console.log('替换为:', replacement);
            return replacement;
          }
          return area;
        });
        console.log('处理后的focusAreas:', trainingPlan.focusAreas);
      }
      
      if (trainingPlan.specialAdvice) {
        console.log('处理前的specialAdvice:', trainingPlan.specialAdvice);
        trainingPlan.specialAdvice = trainingPlan.specialAdvice.map(advice => {
          if (advice.includes('专项建议') || advice.includes('具体建议')) {
            console.log('发现占位符:', advice);
            // 根据训练目标和司职位置生成实际建议
            const actualAdvice = [];
            if (goals) {
              actualAdvice.push(`重点提升${goals}技能`);
            }
            if (specialGoals) {
              actualAdvice.push(`重点关注${specialGoals}专项训练`);
            }
            const replacement = actualAdvice.length > 0 ? actualAdvice[0] : '保持训练规律，循序渐进';
            console.log('替换为:', replacement);
            return replacement;
          }
          return advice;
        });
        console.log('处理后的specialAdvice:', trainingPlan.specialAdvice);
      }
      
      console.log('处理后的训练计划:', trainingPlan);
      
      // 验证和调整训练计划（无年龄相关）
      trainingPlan = validateAndAdjustTrainingPlan(trainingPlan, goals, specialGoals);
      
      // 验证训练时间是否合理，如果不合理则调整
      const timeValidation = validateTrainingTime(trainingPlan.weeklySchedule, availableTime);
      if (!timeValidation.isValid) {
        console.log('训练时间不合理，进行调整:', timeValidation.message);
        trainingPlan = adjustTrainingTime(trainingPlan, availableTime);
      }
      
    } catch (parseError) {
      console.error('AI响应JSON解析失败:', parseError);
      console.log('使用基于输入参数的默认训练计划');
      
      // 使用默认训练计划
      trainingPlan = generateDefaultTrainingPlan(level, goals, trainingYears, specialGoals, availableTime);
    }
    
    res.json({ success: true, trainingPlan });
  } catch (error) {
    console.error('训练计划生成错误:', error);
    res.status(500).json({ error: '训练计划生成失败', details: error.message });
  }
});

// 营养建议
app.post('/api/ai/nutrition-advice', async (req, res) => {
  try {
    const { age, weight, height, intensity, duration, gender, dietTaboo, specialNeeds } = req.body;
    
    console.log('营养建议生成请求参数:', { age, weight, height, intensity, duration, gender, dietTaboo, specialNeeds });
    
    const prompt = `
你是一名专业运动营养师，请根据以下小球员的具体情况制定科学的、个性化的营养建议。

球员信息：
- 年龄：${age || '未知'}岁
- 性别：${gender || '未知'}
- 体重：${weight || '未知'}kg
- 身高：${height || '未知'}cm
- 饮食禁忌：${dietTaboo || '无'}
- 特殊需求：${specialNeeds || '无'}

训练数据：
- 训练强度：${intensity || '未知'}
- 训练时长：${duration || '未知'}小时/周

**强制要求：你必须根据以上参数进行精确计算，不能使用通用数值**

**每日热量需求计算（必须执行）：**
1. 基础代谢率(BMR)计算：
   - 男孩：BMR = 17.686 × 体重(kg) + 658.2
   - 女孩：BMR = 13.384 × 体重(kg) + 692.6
2. 训练强度系数：
   - 低强度：1.1倍
   - 中等强度：1.3倍
   - 高强度：1.5倍
3. 训练时长调整：每增加1小时训练，增加5%热量
4. 最终每日热量 = BMR × 训练强度系数 × (1 + 训练时长调整)

**营养素配比计算（必须执行）：**
- 蛋白质：15-25%（根据训练强度调整）
- 碳水化合物：55-65%
- 脂肪：20-25%

**具体计算示例（年龄${age}岁，性别${gender}，体重${weight}kg，训练强度${intensity}）：**
- BMR = ${gender === '女' ? '13.384' : '17.686'} × ${weight} + ${gender === '女' ? '692.6' : '658.2'}
- 训练强度系数：${intensity === '低强度' ? 1.1 : intensity === '中等强度' ? 1.3 : 1.5}
- 训练时长调整：${duration ? duration * 0.05 : 0}
- 最终每日热量：请严格按上述公式计算

请严格按照以下JSON格式输出，不要添加任何其他内容，不要包含任何注释：
{
  "dailyCalories": "xxxxkcal",
  "macronutrients": {
    "protein": "xxg",
    "carbs": "xxg",
    "fats": "xxg"
  },
  "preTraining": "训练前饮食建议",
  "postTraining": "训练后饮食建议",
  "supplements": ["补充剂1", "补充剂2"],
  "dietTabooAdvice": "饮食禁忌建议",
  "sampleMenu": ["早餐建议", "午餐建议", "晚餐建议"],
  "notes": "注意事项"
}

重要提醒：
1. 必须根据年龄、性别、体重、身高、训练强度计算个性化热量需求
2. sampleMenu字段必须是字符串数组格式，每个元素是一个完整的餐点建议
3. 所有字段都必须有具体内容，不能为空字符串
4. 确保建议适合青少年运动员
5. 根据训练强度调整营养素配比
`;

    const ollamaClient = new Ollama();
    const response = await ollamaClient.chat({
      model: 'qwen2:0.5b',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log('AI营养建议响应内容:', response.message.content);

    let nutritionAdvice;
    
    // 简化的JSON解析策略：直接尝试解析，失败则使用默认建议
    try {
      // 直接尝试解析AI响应
      nutritionAdvice = parseAIResponse(response.message.content);
      console.log('营养建议AI响应解析成功:', nutritionAdvice);
      
      const isPlaceholder = (str) => !str || str.length < 8 || /建议|无|未指定|低强度|中等强度|高强度/.test(str.trim());
      const defaultAdvice = generateDefaultNutritionAdvice(age, weight, height, intensity, duration, gender, dietTaboo, specialNeeds);

      // 验证和清理数据格式，对占位词进行兜底
      nutritionAdvice = {
        dailyCalories: nutritionAdvice.dailyCalories || defaultAdvice.dailyCalories,
        macronutrients: nutritionAdvice.macronutrients || defaultAdvice.macronutrients,
        preTraining: isPlaceholder(nutritionAdvice.preTraining) ? defaultAdvice.preTraining : nutritionAdvice.preTraining,
        postTraining: isPlaceholder(nutritionAdvice.postTraining) ? defaultAdvice.postTraining : nutritionAdvice.postTraining,
        supplements: (!nutritionAdvice.supplements || !Array.isArray(nutritionAdvice.supplements) || nutritionAdvice.supplements.length === 0 || nutritionAdvice.supplements.every(s => isPlaceholder(s))) ? defaultAdvice.supplements : nutritionAdvice.supplements,
        dietTabooAdvice: isPlaceholder(nutritionAdvice.dietTabooAdvice) ? defaultAdvice.dietTabooAdvice : nutritionAdvice.dietTabooAdvice,
        sampleMenu: (!nutritionAdvice.sampleMenu || !Array.isArray(nutritionAdvice.sampleMenu) || nutritionAdvice.sampleMenu.length === 0 || nutritionAdvice.sampleMenu.every(s => isPlaceholder(s))) ? defaultAdvice.sampleMenu : nutritionAdvice.sampleMenu,
        notes: isPlaceholder(nutritionAdvice.notes) ? defaultAdvice.notes : nutritionAdvice.notes,
      };
      
      console.log('处理后的营养建议:', nutritionAdvice);
      
    } catch (parseError) {
      console.error('营养建议JSON解析失败:', parseError);
      console.log('使用基于输入参数的默认营养建议');
      
      // 使用基于输入参数的默认营养建议
      nutritionAdvice = generateDefaultNutritionAdvice(age, weight, height, intensity, duration, gender, dietTaboo, specialNeeds);
    }
    
    // 最终验证：确保热量计算正确
    const ageNum = parseInt(age) || 12;
    const weightNum = parseFloat(weight) || 45;
    const durationNum = parseFloat(duration) || 5;
    let baseCalories = 0;
    if (gender === '女') {
      if (ageNum < 10) {
        baseCalories = 22.5 * weightNum + 499;
      } else {
        baseCalories = 13.384 * weightNum + 692.6;
      }
    } else {
      if (ageNum < 10) {
        baseCalories = 22.7 * weightNum + 495;
      } else {
        baseCalories = 17.686 * weightNum + 658.2;
      }
    }
    let intensityMultiplier = 1.0;
    if (intensity === '低强度') {
      intensityMultiplier = 1.1;
    } else if (intensity === '中等强度') {
      intensityMultiplier = 1.3;
    } else if (intensity === '高强度') {
      intensityMultiplier = 1.5;
    }
    const durationMultiplier = 1 + (durationNum * 0.05);
    const correctDailyCalories = Math.round(baseCalories * intensityMultiplier * durationMultiplier);
    
    // 如果AI返回的热量明显错误（比如1200kcal这种固定值），则使用计算值
    const aiCalories = parseInt(nutritionAdvice.dailyCalories) || 0;
    if (aiCalories === 1200 || aiCalories < 1000 || aiCalories > 5000) {
      console.log(`AI返回热量${aiCalories}kcal可能不正确，使用计算值${correctDailyCalories}kcal`);
      nutritionAdvice.dailyCalories = `${correctDailyCalories}kcal`;
      
      // 重新计算营养素
      let proteinRatio, carbsRatio, fatsRatio;
      if (intensity === '高强度') {
        proteinRatio = ageNum < 8 ? 0.20 : 0.25;
        carbsRatio = 0.55;
        fatsRatio = ageNum < 8 ? 0.25 : 0.20;
      } else if (intensity === '中等强度') {
        proteinRatio = ageNum < 8 ? 0.18 : 0.20;
        carbsRatio = 0.60;
        fatsRatio = ageNum < 8 ? 0.22 : 0.20;
      } else {
        proteinRatio = ageNum < 8 ? 0.15 : 0.15;
        carbsRatio = 0.65;
        fatsRatio = ageNum < 8 ? 0.20 : 0.20;
      }
      
      const protein = Math.round((correctDailyCalories * proteinRatio) / 4);
      const carbs = Math.round((correctDailyCalories * carbsRatio) / 4);
      const fats = Math.round((correctDailyCalories * fatsRatio) / 9);
      
      // 保证macronutrients结构完整
      const macronutrients = {
        protein: typeof protein === 'number' && protein > 0 ? `${protein}g` : '0g',
        carbs: typeof carbs === 'number' && carbs > 0 ? `${carbs}g` : '0g',
        fats: typeof fats === 'number' && fats > 0 ? `${fats}g` : '0g'
      };
      
      nutritionAdvice.macronutrients = macronutrients;
    } else {
      console.log(`AI返回热量${aiCalories}kcal在合理范围内，保持使用`);
    }
    
    res.json({ success: true, nutritionAdvice });
  } catch (error) {
    console.error('营养建议生成错误:', error);
    res.status(500).json({ error: '营养建议生成失败', details: error.message });
  }
});

// 统一球员评估接口
app.post('/api/ai/player-assessment', async (req, res) => {
  try {
    const { assessmentType, basic, physical, skills, match, subjective } = req.body;
    
    // 根据评估类型构建不同的分析逻辑
    let analysis;
    
    if (assessmentType === 'objective' || assessmentType === 'comprehensive') {
      // 基于客观数据的评估
      analysis = {
        physical: {
          speed: calculateSpeedScore(physical),
          endurance: calculateEnduranceScore(physical),
          strength: calculateStrengthScore(physical),
          overall: calculatePhysicalOverall(physical)
        },
        technical: {
          ballControl: calculateBallControlScore(skills),
          passing: calculatePassingScore(skills),
          shooting: calculateShootingScore(skills),
          overall: calculateTechnicalOverall(skills)
        },
        performance: {
          attack: calculateAttackScore(match),
          defense: calculateDefenseScore(match),
          teamwork: calculateTeamworkScore(match),
          overall: calculatePerformanceOverall(match)
        }
      };
    }
    
    if (assessmentType === 'subjective' || assessmentType === 'comprehensive') {
      // 基于主观评估的分析
      const subjectiveAnalysis = analyzeSubjectiveData(subjective, basic);
      if (assessmentType === 'subjective') {
        analysis = subjectiveAnalysis;
      } else {
        // 综合评估：结合客观和主观数据
        analysis = combineAssessments(analysis, subjectiveAnalysis);
      }
    }
    
    // 生成整体评估
    const overall = generateOverallAssessment(analysis, basic);
    
    res.json({ 
      success: true, 
      analysis: { ...analysis, overall }
    });
  } catch (error) {
    console.error('球员评估错误:', error);
    res.status(500).json({ error: '球员评估失败', details: error.message });
  }
});

// 生成基于输入参数的默认训练计划
function generateDefaultTrainingPlan(level, goals, trainingYears, specialGoals, availableTime) {
  const availableTimeNum = parseInt(availableTime) || 5;
  
  console.log('生成默认训练计划参数:', { level, goals, trainingYears, specialGoals, availableTimeNum });
  
  // 计算每天训练时间（平均分配到7天，处理余数）
  const totalTrainingMinutes = availableTimeNum * 60; // 总训练分钟数
  const baseDailyMinutes = Math.floor(totalTrainingMinutes / 7); // 基础每天分钟数
  const remainingMinutes = totalTrainingMinutes % 7; // 剩余分钟数
  
  // 随机选择一天来分配剩余分钟数
  const extraMinutesDay = Math.floor(Math.random() * 7);
  
  console.log('时间分配:', { 
    availableTimeNum, 
    totalTrainingMinutes, 
    baseDailyMinutes,
    remainingMinutes,
    extraMinutesDay
  });
  
  // 根据训练目标生成训练内容
  const trainingGoalsList = goals ? goals.split(',').map(g => g.trim()) : ["提升基础技能"];
  const specialGoalsList = specialGoals ? specialGoals.split(',').map(g => g.trim()) : [];
  
  // 训练目标对应的训练内容映射
  const goalTrainingMap = {
    "射门技术": ["射门练习", "射门技巧训练", "射门力量训练", "射门准确性训练"],
    "传球技术": ["传球练习", "传球准确性训练", "传球技巧训练", "传球力量控制"],
    "控球技术": ["控球练习", "控球技巧训练", "控球稳定性训练", "转身突破"],
    "防守技术": ["防守练习", "防守站位训练", "防守技巧训练", "拦截训练"],
    "体能": ["体能训练", "耐力训练", "力量训练", "爆发力训练"],
    "速度": ["速度训练", "爆发力训练", "敏捷性训练", "反应速度训练"],
    "战术理解": ["战术训练", "战术分析", "战术执行", "阵型理解"],
    "团队配合": ["团队训练", "配合练习", "团队战术", "沟通训练"],
    "提升基础技能": ["基础技术训练", "技能练习", "基础配合"],
    "增强体能": ["体能训练", "耐力训练", "力量训练"],
    "改善团队配合": ["团队训练", "配合练习", "团队战术"]
  };
  
  // 司职位置对应的训练内容映射
  const positionTrainingMap = {
    "前锋": ["射门练习", "跑位训练", "进攻配合", "射门技巧", "门前嗅觉训练"],
    "中场": ["传球练习", "控球训练", "战术理解", "组织进攻", "视野训练"],
    "后卫": ["防守练习", "防守站位", "防守技巧", "防守配合", "头球训练"],
    "门将": ["扑救练习", "门将技术", "门将反应", "门将指挥", "手抛球训练"],
    "边锋": ["边路突破", "传中练习", "速度训练", "边路配合"],
    "中锋": ["射门练习", "头球训练", "背身拿球", "进攻配合"],
    "后腰": ["防守练习", "拦截训练", "传球组织", "防守指挥"],
    "中后卫": ["防守练习", "头球训练", "防守站位", "防守指挥"],
    "边后卫": ["防守练习", "边路突破", "传中练习", "防守配合"]
  };
  
  // 生成所有训练类型
  const allTrainingTypes = [];
  
  // 根据训练目标添加训练内容
  trainingGoalsList.forEach(goal => {
    if (goalTrainingMap[goal]) {
      allTrainingTypes.push(...goalTrainingMap[goal]);
    } else {
      allTrainingTypes.push(`${goal}训练`);
    }
  });
  
  // 根据司职位置添加训练内容
  specialGoalsList.forEach(position => {
    if (positionTrainingMap[position]) {
      allTrainingTypes.push(...positionTrainingMap[position]);
    } else {
      allTrainingTypes.push(`${position}专项训练`);
    }
  });
  
  // 如果没有训练内容，使用默认的
  if (allTrainingTypes.length === 0) {
    allTrainingTypes.push('基础技术训练', '体能训练', '战术训练', '技能练习', '团队配合');
  }
  
  console.log('生成的训练类型:', allTrainingTypes);
  
  // 生成每周训练安排（7天都有训练）
  const weeklySchedule = {};
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  let trainingTypeIndex = 0;
  
  weekDays.forEach((day, idx) => {
    const trainingType = allTrainingTypes[trainingTypeIndex % allTrainingTypes.length];
    // 计算当天的训练分钟数
    const dailyMinutes = idx === extraMinutesDay ? baseDailyMinutes + remainingMinutes : baseDailyMinutes;
    weeklySchedule[day] = `${trainingType}：${dailyMinutes}分钟`;
    trainingTypeIndex++;
  });
  
  // 生成重点领域
  const focusAreas = [...new Set([...trainingGoalsList, ...specialGoalsList])];
  
  // 生成特殊建议
  const specialAdvice = [];
  if (specialGoals) {
    specialAdvice.push(`重点关注${specialGoals}专项训练`);
  }
  if (goals) {
    specialAdvice.push(`重点提升${goals}技能`);
  }
  
  return {
    trainingGoals: trainingGoalsList,
    weeklySchedule: weeklySchedule,
    focusAreas: focusAreas,
    intensity: "中等",
    specialAdvice: specialAdvice,
    notes: `训练计划：每周训练7天，每天约${baseDailyMinutes}分钟，总训练时长${totalTrainingMinutes}分钟`
  };
}

// 验证训练时间是否合理
function validateTrainingTime(weeklySchedule, availableTime) {
  const availableTimeNum = parseInt(availableTime) || 5;
  const targetMinutes = availableTimeNum * 60;
  
  // 提取所有训练时间
  const trainingTimes = Object.values(weeklySchedule)
    .filter(day => day !== "休息" && day !== "休息或轻度活动")
    .map(day => {
      // 尝试提取分钟数
      const match = day.match(/(\d+)\s*分钟/);
      return match ? parseInt(match[1]) : 0;
    });
  
  const totalMinutes = trainingTimes.reduce((sum, minutes) => sum + minutes, 0);
  const trainingDays = trainingTimes.filter(minutes => minutes > 0).length;
  
  // 验证规则 - 7天训练，每天都有训练内容
  const isValid = 
    totalMinutes > 0 && // 有训练时间
    Math.abs(totalMinutes - targetMinutes) <= 10 && // 总时间与目标时间差异不超过10分钟
    trainingDays === 7; // 必须训练7天
  
  return {
    isValid,
    totalMinutes,
    targetMinutes,
    trainingDays,
    difference: totalMinutes - targetMinutes,
    percentage: Math.round((totalMinutes / targetMinutes) * 100),
    message: isValid ? '训练时间合理' : `训练时间不合理：总时长${totalMinutes}分钟，目标时长${targetMinutes}分钟，差异${Math.abs(totalMinutes - targetMinutes)}分钟，训练天数${trainingDays}天`
  };
}

// 生成基于输入参数的默认营养建议
function generateDefaultNutritionAdvice(age, weight, height, intensity, duration, gender, dietTaboo, specialNeeds) {
  const ageNum = parseInt(age) || 12;
  const weightNum = parseFloat(weight) || 45;
  const heightNum = parseInt(height) || 150;
  const durationNum = parseFloat(duration) || 5;

  // 分年龄段BMR公式
  let baseCalories = 0;
  if (gender === '女') {
    if (ageNum < 10) {
      baseCalories = 22.5 * weightNum + 499; // 3-10岁女
    } else {
      baseCalories = 13.384 * weightNum + 692.6; // 10-18岁女
    }
  } else {
    if (ageNum < 10) {
      baseCalories = 22.7 * weightNum + 495; // 3-10岁男
    } else {
      baseCalories = 17.686 * weightNum + 658.2; // 10-18岁男
    }
  }

  let intensityMultiplier = 1.0;
  if (intensity === '低强度') {
    intensityMultiplier = 1.1;
  } else if (intensity === '中等强度') {
    intensityMultiplier = 1.3;
  } else if (intensity === '高强度') {
    intensityMultiplier = 1.5;
  }
  const durationMultiplier = 1 + (durationNum * 0.05);
  const dailyCalories = Math.round(baseCalories * intensityMultiplier * durationMultiplier);

  // 营养素配比
  let proteinRatio, carbsRatio, fatsRatio;
  if (intensity === '高强度') {
    proteinRatio = 0.25;
    carbsRatio = 0.55;
    fatsRatio = 0.20;
  } else if (intensity === '中等强度') {
    proteinRatio = 0.20;
    carbsRatio = 0.60;
    fatsRatio = 0.20;
  } else {
    proteinRatio = 0.15;
    carbsRatio = 0.65;
    fatsRatio = 0.20;
  }
  const protein = Math.round((dailyCalories * proteinRatio) / 4);
  const carbs = Math.round((dailyCalories * carbsRatio) / 4);
  const fats = Math.round((dailyCalories * fatsRatio) / 9);

  // 动态分配三大营养素到三餐
  const breakfastProtein = Math.round(protein * 0.25);
  const lunchProtein = Math.round(protein * 0.4);
  const dinnerProtein = protein - breakfastProtein - lunchProtein;
  const breakfastCarbs = Math.round(carbs * 0.25);
  const lunchCarbs = Math.round(carbs * 0.4);
  const dinnerCarbs = carbs - breakfastCarbs - lunchCarbs;
  const breakfastFats = Math.round(fats * 0.25);
  const lunchFats = Math.round(fats * 0.4);
  const dinnerFats = fats - breakfastFats - lunchFats;

  // 动态生成食物分量
  const eggNum = Math.max(1, Math.round(breakfastProtein / 6));
  const milkMl = Math.max(100, Math.round((breakfastProtein * 0.3) / 0.03));
  const oatG = Math.max(30, Math.round(breakfastCarbs * 1.2));
  const breakfastFatSource = breakfastFats > 8 ? `+ 坚果10g` : '';
  const breakfast = `早餐：燕麦${oatG}g、鸡蛋${eggNum}个、牛奶${milkMl}ml、水果1份${breakfastFatSource}`;

  const riceG = Math.max(80, Math.round(lunchCarbs * 4));
  const chickenG = Math.max(50, Math.round(lunchProtein / 0.22));
  const lunchFatSource = lunchFats > 8 ? `+ 橄榄油10g` : '';
  const lunch = `午餐：米饭${riceG}g、鸡胸肉${chickenG}g、蔬菜1份${lunchFatSource}`;

  const pastaG = Math.max(60, Math.round(dinnerCarbs * 3.2));
  const beefG = Math.max(50, Math.round(dinnerProtein / 0.20));
  const dinnerFatSource = dinnerFats > 8 ? `+ 核桃10g` : '';
  const dinner = `晚餐：意面${pastaG}g、牛肉${beefG}g、蔬菜沙拉1份${dinnerFatSource}`;

  const sampleMenu = [breakfast, lunch, dinner];

  // 动态生成训练前/后饮食建议
  const preCarbs = Math.max(20, Math.round(carbs * 0.15));
  const preProtein = Math.max(5, Math.round(protein * 0.1));
  const preTraining = `训练前2小时：全麦面包${Math.round(preCarbs/15)}片（约${preCarbs}g碳水），鸡蛋${Math.max(1,Math.round(preProtein/6))}个（约${preProtein}g蛋白），香蕉1根。\n训练前30分钟：水果1份或能量棒。`;

  const postProtein = Math.max(15, Math.round(protein * 0.2));
  const postCarbs = Math.max(20, Math.round(carbs * 0.1));
  const postTraining = `训练后30分钟内：蛋白粉奶昔1杯（约${postProtein}g蛋白），香蕉1根（约${postCarbs}g碳水）；\n训练后2小时：米饭${Math.round(postCarbs*4)}g、鸡胸肉${Math.round(postProtein/0.22)}g、蔬菜1份。`;

  // 补充剂建议
  let supplements = ["维生素D"];
  if (ageNum < 8) {
    supplements.push("钙片", "维生素C", "维生素A");
  } else if (ageNum < 12) {
    supplements.push("钙片", "维生素C");
  } else {
    supplements.push("钙片", "维生素C", "复合维生素B");
  }
  if (!supplements.length || supplements.every(s => !s || s === '无' || s === '未指定')) {
    supplements = ["维生素D", "钙片", "复合维生素B"];
  }
  let dietTabooAdvice = dietTaboo && dietTaboo.trim() && dietTaboo !== '无' ? `严格避免${dietTaboo}，选择替代食物补充营养` : "保持均衡饮食，避免高糖高脂食物";
  let specialNotes = "根据训练强度调整热量摄入";
  if (specialNeeds) {
    specialNotes = `考虑${specialNeeds}的特殊需求，调整饮食方案`;
  }

  return {
    dailyCalories: dailyCalories.toString(),
    macronutrients: {
      protein: `${protein}g`,
      carbs: `${carbs}g`,
      fats: `${fats}g`
    },
    preTraining,
    postTraining,
    supplements,
    dietTabooAdvice,
    sampleMenu,
    notes: `${specialNotes}，适合${ageNum}岁、${weightNum}kg的青少年，每周训练${durationNum}小时，性别：${gender || '未知'}`
  };
}

// 球员评估辅助函数：计算各项评分
function calculateSpeedScore(physical) {
  const scores = [];
  if (physical.sprint30m) scores.push(Math.max(0, 100 - (parseFloat(physical.sprint30m) - 4.5) * 20));
  if (physical.sprint50m) scores.push(Math.max(0, 100 - (parseFloat(physical.sprint50m) - 7.0) * 15));
  if (physical.sprint100m) scores.push(Math.max(0, 100 - (parseFloat(physical.sprint100m) - 13.0) * 10));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 75;
}

function calculateEnduranceScore(physical) {
  const scores = [];
  if (physical.run12min) scores.push(Math.min(100, parseFloat(physical.run12min) / 20));
  if (physical.yoyoTest) scores.push(Math.min(100, parseFloat(physical.yoyoTest) * 10));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 70;
}

function calculateStrengthScore(physical) {
  const scores = [];
  if (physical.longJump) scores.push(Math.min(100, parseFloat(physical.longJump) / 2));
  if (physical.pullUps) scores.push(Math.min(100, parseFloat(physical.pullUps) * 5));
  if (physical.squat) scores.push(Math.min(100, parseFloat(physical.squat) / 2));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 72;
}

function calculatePhysicalOverall(physical) {
  const speed = calculateSpeedScore(physical);
  const endurance = calculateEnduranceScore(physical);
  const strength = calculateStrengthScore(physical);
  return Math.round((speed + endurance + strength) / 3);
}

function calculateBallControlScore(skills) {
  const scores = [];
  if (skills.juggling) scores.push(Math.min(100, parseFloat(skills.juggling) * 2));
  if (skills.ballControl) scores.push(Math.min(100, parseFloat(skills.ballControl) * 2));
  if (skills.dribbling) scores.push(Math.max(0, 100 - (parseFloat(skills.dribbling) - 15) * 5));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 78;
}

function calculatePassingScore(skills) {
  const scores = [];
  if (skills.shortPass) scores.push(parseFloat(skills.shortPass));
  if (skills.longPass) scores.push(parseFloat(skills.longPass));
  if (skills.passSpeed) scores.push(Math.max(0, 100 - (parseFloat(skills.passSpeed) - 2) * 20));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 75;
}

function calculateShootingScore(skills) {
  const scores = [];
  if (skills.shootingAccuracy) scores.push(parseFloat(skills.shootingAccuracy));
  if (skills.shootingPower) scores.push(Math.min(100, parseFloat(skills.shootingPower) / 2));
  if (skills.shootingDistance) scores.push(Math.min(100, parseFloat(skills.shootingDistance) * 2));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 70;
}

function calculateTechnicalOverall(skills) {
  const ballControl = calculateBallControlScore(skills);
  const passing = calculatePassingScore(skills);
  const shooting = calculateShootingScore(skills);
  return Math.round((ballControl + passing + shooting) / 3);
}

function calculateAttackScore(match) {
  const scores = [];
  if (match.goals) scores.push(Math.min(100, parseFloat(match.goals) * 10));
  if (match.assists) scores.push(Math.min(100, parseFloat(match.assists) * 8));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 76;
}

function calculateDefenseScore(match) {
  // 基于比赛数据估算防守能力
  return 68; // 默认值，实际需要更多防守相关数据
}

function calculateTeamworkScore(match) {
  const scores = [];
  if (match.passes) scores.push(Math.min(100, parseFloat(match.passes) / 5));
  if (match.passRate) scores.push(parseFloat(match.passRate));
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 72;
}

function calculatePerformanceOverall(match) {
  const attack = calculateAttackScore(match);
  const defense = calculateDefenseScore(match);
  const teamwork = calculateTeamworkScore(match);
  return Math.round((attack + defense + teamwork) / 3);
}

function analyzeSubjectiveData(subjective, basic) {
  // 基于主观数据的分析（简化版）
  return {
    physical: { speed: 75, endurance: 70, strength: 72, overall: 72 },
    technical: { ballControl: 78, passing: 75, shooting: 70, overall: 74 },
    performance: { attack: 76, defense: 68, teamwork: 72, overall: 72 }
  };
}

function combineAssessments(objective, subjective) {
  // 综合客观和主观评估
  return {
    physical: {
      speed: Math.round((objective.physical.speed + subjective.physical.speed) / 2),
      endurance: Math.round((objective.physical.endurance + subjective.physical.endurance) / 2),
      strength: Math.round((objective.physical.strength + subjective.physical.strength) / 2),
      overall: Math.round((objective.physical.overall + subjective.physical.overall) / 2)
    },
    technical: {
      ballControl: Math.round((objective.technical.ballControl + subjective.technical.ballControl) / 2),
      passing: Math.round((objective.technical.passing + subjective.technical.passing) / 2),
      shooting: Math.round((objective.technical.shooting + subjective.technical.shooting) / 2),
      overall: Math.round((objective.technical.overall + subjective.technical.overall) / 2)
    },
    performance: {
      attack: Math.round((objective.performance.attack + subjective.performance.attack) / 2),
      defense: Math.round((objective.performance.defense + subjective.performance.defense) / 2),
      teamwork: Math.round((objective.performance.teamwork + subjective.performance.teamwork) / 2),
      overall: Math.round((objective.performance.overall + subjective.performance.overall) / 2)
    }
  };
}

function generateOverallAssessment(analysis, basic) {
  const physicalOverall = analysis.physical.overall;
  const technicalOverall = analysis.technical.overall;
  const performanceOverall = analysis.performance.overall;
  
  const overallScore = Math.round((physicalOverall + technicalOverall + performanceOverall) / 3);
  
  // 生成优势、不足和建议
  const strengths = [];
  const weaknesses = [];
  const improvements = [];
  
  if (physicalOverall >= 75) strengths.push("体能素质优秀");
  if (technicalOverall >= 75) strengths.push("技术基础扎实");
  if (performanceOverall >= 75) strengths.push("比赛表现良好");
  
  if (physicalOverall < 70) {
    weaknesses.push("体能需要提升");
    improvements.push("加强体能训练");
  }
  if (technicalOverall < 70) {
    weaknesses.push("技术有待提高");
    improvements.push("加强技术训练");
  }
  if (performanceOverall < 70) {
    weaknesses.push("比赛经验不足");
    improvements.push("增加比赛机会");
  }
  
  // 默认值
  if (strengths.length === 0) strengths.push("基础条件良好");
  if (weaknesses.length === 0) weaknesses.push("各方面均衡发展");
  if (improvements.length === 0) improvements.push("继续保持训练");
  
  return {
    score: overallScore,
    strengths,
    weaknesses,
    improvements,
    potential: overallScore >= 80 ? "高" : overallScore >= 70 ? "中" : "低",
    positionFit: 80,
    positionSuggestions: ["当前位置适配度良好"],
    recommendations: ["继续加强基础训练", "参加更多比赛积累经验"]
  };
}

// 验证和调整训练计划
function validateAndAdjustTrainingPlan(trainingPlan, goals, specialGoals) {
  console.log('验证训练计划:', { goals, specialGoals });
  
  // 调整训练强度为中等
  let adjustedIntensity = '中等';
  
  // 检查每周训练安排
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let hasRestDay = false;
  let totalTrainingDays = 0;
  
  weekDays.forEach(day => {
    const content = trainingPlan.weeklySchedule[day];
    if (content && (content.includes('休息') || content.includes('轻度活动'))) {
      hasRestDay = true;
    } else if (content && !content.includes('休息')) {
      totalTrainingDays++;
    }
  });
  
  // 确保有休息日
  if (!hasRestDay && totalTrainingDays >= 6) {
    trainingPlan.weeklySchedule.sunday = '休息或轻度活动';
  }
  
  // 调整训练目标，确保与输入参数相关
  if (goals && (!trainingPlan.trainingGoals || trainingPlan.trainingGoals.length === 0)) {
    trainingPlan.trainingGoals = goals.split(/[，,、]/).map(g => g.trim());
  }
  
  // 调整重点专项，确保与司职相关
  if (specialGoals && (!trainingPlan.focusAreas || trainingPlan.focusAreas.length === 0)) {
    const positionFocusMap = {
      '前锋': ['射门技巧', '跑位训练', '进攻配合'],
      '中场': ['传球技巧', '控球训练', '战术理解'],
      '后卫': ['防守技巧', '防守站位', '防守配合'],
      '门将': ['扑救技巧', '门将技术', '门将反应']
    };
    trainingPlan.focusAreas = positionFocusMap[specialGoals] || [specialGoals];
  }
  
  // 更新注意事项
  let adjustedNotes = trainingPlan.notes || '';
  if (!adjustedNotes.includes('训练计划：')) {
    adjustedNotes = `训练计划：${adjustedNotes}`;
  }
  
  return {
    ...trainingPlan,
    intensity: adjustedIntensity,
    notes: adjustedNotes
  };
}

// 调整训练时间以匹配可用时间
function adjustTrainingTime(trainingPlan, availableTime) {
  const availableTimeNum = parseInt(availableTime) || 5;
  const targetMinutes = availableTimeNum * 60;
  
  // 计算每天训练时间（平均分配到7天，处理余数）
  const baseDailyMinutes = Math.floor(targetMinutes / 7); // 基础每天分钟数
  const remainingMinutes = targetMinutes % 7; // 剩余分钟数
  
  // 随机选择一天来分配剩余分钟数
  const extraMinutesDay = Math.floor(Math.random() * 7);
  
  // 获取所有训练类型
  const allTrainingTypes = [];
  if (trainingPlan.trainingGoals) {
    allTrainingTypes.push(...trainingPlan.trainingGoals);
  }
  if (trainingPlan.focusAreas) {
    allTrainingTypes.push(...trainingPlan.focusAreas);
  }
  
  // 如果没有训练类型，使用默认的
  if (allTrainingTypes.length === 0) {
    allTrainingTypes.push('基础技术训练', '体能训练', '战术训练', '技能练习', '团队配合');
  }
  
  // 重新生成每周训练安排（7天都有训练）
  const weeklySchedule = {};
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  let trainingTypeIndex = 0;
  
  weekDays.forEach((day, idx) => {
    const trainingType = allTrainingTypes[trainingTypeIndex % allTrainingTypes.length];
    // 计算当天的训练分钟数
    const dailyMinutes = idx === extraMinutesDay ? baseDailyMinutes + remainingMinutes : baseDailyMinutes;
    weeklySchedule[day] = `${trainingType}：${dailyMinutes}分钟`;
    trainingTypeIndex++;
  });
  
  // 更新训练计划
  return {
    ...trainingPlan,
    weeklySchedule: weeklySchedule,
    notes: `训练计划：每周训练7天，每天约${baseDailyMinutes}分钟，总训练时长${targetMinutes}分钟`
  };
}

// 话题管理接口
// 获取话题列表
app.get('/api/topics', (req, res) => {
  try {
    let topics = [];
    if (fs.existsSync('topics.json')) {
      topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));
    }
    res.json(topics);
  } catch (error) {
    console.error('获取话题列表失败:', error);
    res.status(500).json({ error: '获取话题列表失败' });
  }
});

// 发布新话题
app.post('/api/topics', (req, res) => {
  try {
    const { title, content, author, authorRole, tags } = req.body;
    
    if (!title || !content || !author || !authorRole) {
      return res.status(400).json({ error: '标题、内容、作者和身份为必填项' });
    }
    
    let topics = [];
    if (fs.existsSync('topics.json')) {
      topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));
    }
    
    const newTopic = {
      id: Date.now().toString(),
      title,
      content,
      author,
      authorRole,
      tags: tags || [],
      replies: [],
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    topics.unshift(newTopic); // 新话题放在最前面
    fs.writeFileSync('topics.json', JSON.stringify(topics, null, 2));
    
    res.json({ success: true, topic: newTopic });
  } catch (error) {
    console.error('发布话题失败:', error);
    res.status(500).json({ error: '发布话题失败' });
  }
});

// 获取话题详情
app.get('/api/topics/:id', (req, res) => {
  try {
    let topics = [];
    if (fs.existsSync('topics.json')) {
      topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));
    }
    
    const topic = topics.find(t => t.id === req.params.id);
    if (!topic) {
      return res.status(404).json({ error: '话题不存在' });
    }
    
    // 增加浏览量
    topic.views += 1;
    fs.writeFileSync('topics.json', JSON.stringify(topics, null, 2));
    
    res.json(topic);
  } catch (error) {
    console.error('获取话题详情失败:', error);
    res.status(500).json({ error: '获取话题详情失败' });
  }
});

// 回复话题
app.post('/api/topics/:id/replies', (req, res) => {
  try {
    const { content, author, authorRole } = req.body;
    
    if (!content || !author || !authorRole) {
      return res.status(400).json({ error: '回复内容、作者和身份为必填项' });
    }
    
    let topics = [];
    if (fs.existsSync('topics.json')) {
      topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));
    }
    
    const topicIndex = topics.findIndex(t => t.id === req.params.id);
    if (topicIndex === -1) {
      return res.status(404).json({ error: '话题不存在' });
    }
    
    const newReply = {
      id: Date.now().toString(),
      content,
      author,
      authorRole,
      createdAt: new Date().toISOString()
    };
    
    topics[topicIndex].replies.push(newReply);
    topics[topicIndex].updatedAt = new Date().toISOString();
    
    fs.writeFileSync('topics.json', JSON.stringify(topics, null, 2));
    
    res.json({ success: true, reply: newReply });
  } catch (error) {
    console.error('回复话题失败:', error);
    res.status(500).json({ error: '回复话题失败' });
  }
});

// 点赞话题
app.post('/api/topics/:id/like', (req, res) => {
  try {
    let topics = [];
    if (fs.existsSync('topics.json')) {
      topics = JSON.parse(fs.readFileSync('topics.json', 'utf8'));
    }
    
    const topicIndex = topics.findIndex(t => t.id === req.params.id);
    if (topicIndex === -1) {
      return res.status(404).json({ error: '话题不存在' });
    }
    
    topics[topicIndex].likes += 1;
    fs.writeFileSync('topics.json', JSON.stringify(topics, null, 2));
    
    res.json({ success: true, likes: topics[topicIndex].likes });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({ error: '点赞失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});