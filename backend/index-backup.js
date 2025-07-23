const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// 配置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);

// Ollama客户端配置 - 让Ollama自动检测端口
const { Ollama } = require('ollama');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 存储注册信息
const DATA_FILE = path.join(__dirname, 'players.json');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// 配置Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 9) + ext);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100M，后面会根据字段判断
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('只允许上传图片'));
      }
    }
    if (file.fieldname === 'video') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('只允许上传视频'));
      }
    }
    cb(null, true);
  }
});

// 小将注册接口
app.post('/api/player/register', (req, res) => {
  const player = req.body;
  let players = [];
  if (fs.existsSync(DATA_FILE)) {
    players = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  // 检查姓名+电话唯一性
  if (players.some(p => p.name === player.name && p.phone === player.phone)) {
    return res.status(400).json({ error: '该小将已注册' });
  }
  players.push(player);
  fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
  res.json({ success: true });
});

// 教练入驻接口
app.post('/api/coach/register', (req, res) => {
  const coach = req.body;
  const DATA_FILE = path.join(__dirname, 'coaches.json');
  let coaches = [];
  if (fs.existsSync(DATA_FILE)) {
    coaches = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  // 检查姓名+俱乐部唯一性
  if (coaches.some(c => c.name === coach.name && c.club === coach.club)) {
    return res.status(400).json({ error: '该教练已入驻' });
  }
  coaches.push(coach);
  fs.writeFileSync(DATA_FILE, JSON.stringify(coaches, null, 2));
  res.json({ success: true });
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { role, name, password } = req.body;
  let DATA_FILE = '';
  if (role === 'player') {
    DATA_FILE = path.join(__dirname, 'players.json');
  } else if (role === 'coach') {
    DATA_FILE = path.join(__dirname, 'coaches.json');
  } else {
    return res.status(400).json({ error: '身份类型错误' });
  }
  let users = [];
  if (fs.existsSync(DATA_FILE)) {
    users = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  const user = users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ success: true, role });
});

// 文件上传接口
app.post('/api/upload', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  // 限制图片1M，视频100M
  if (req.files.photo && req.files.photo[0].size > 1 * 1024 * 1024) {
    fs.unlinkSync(req.files.photo[0].path);
    return res.status(400).json({ error: '图片不能超过1M' });
  }
  if (req.files.video && req.files.video[0].size > 100 * 1024 * 1024) {
    fs.unlinkSync(req.files.video[0].path);
    return res.status(400).json({ error: '视频不能超过100M' });
  }
  res.json({
    photo: req.files.photo ? req.files.photo[0].filename : null,
    video: req.files.video ? req.files.video[0].filename : null
  });
});

// 获取所有小将信息（不含密码）
app.get('/api/players', (req, res) => {
  const DATA_FILE = path.join(__dirname, 'players.json');
  let players = [];
  if (fs.existsSync(DATA_FILE)) {
    players = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  // 不返回密码字段
  const safePlayers = players.map(({ password, ...rest }) => rest);
  res.json(safePlayers);
});

// 静态文件服务
app.use('/uploads', express.static(UPLOAD_DIR));

// AI功能接口
// 技能评估
app.post('/api/ai/skill-assessment', async (req, res) => {
  try {
    const { videoUrl, playerInfo } = req.body;
    
    // 检查Ollama服务是否可用
    try {
      await ollama.list();
    } catch (error) {
      return res.status(503).json({ 
        error: 'AI服务暂时不可用，请确保Ollama已启动',
        details: '请运行: ollama serve 启动AI服务'
      });
    }

    // 使用Ollama进行技能评估分析
    const prompt = `
    作为专业的足球教练，请分析以下小球员的训练表现：
    
    球员信息：
    - 年龄：${playerInfo.age || '未知'}
    - 位置：${playerInfo.position || '未知'}
    - 训练时长：${playerInfo.trainingDuration || '未知'}
    
    请从以下方面进行评估：
    1. 传球准确性 (0-100分)
    2. 控球技术 (0-100分)
    3. 射门力量 (0-100分)
    4. 跑位意识 (0-100分)
    5. 整体评分 (0-100分)
    6. 具体改进建议 (3-5条)
    
    请以JSON格式返回结果，包含以上所有评分和建议。
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

    // 解析AI响应
    let assessment;
    
    // 简化的JSON解析策略：直接尝试解析，失败则使用默认评估
    try {
      // 直接尝试解析AI响应
      assessment = JSON.parse(response.message.content);
      console.log('技能评估AI响应解析成功:', assessment);
      
      // 验证和清理数据格式
      assessment = {
        passingAccuracy: typeof assessment.passingAccuracy === 'number' ? assessment.passingAccuracy : 75,
        ballControl: typeof assessment.ballControl === 'number' ? assessment.ballControl : 70,
        shootingPower: typeof assessment.shootingPower === 'number' ? assessment.shootingPower : 72,
        positioning: typeof assessment.positioning === 'number' ? assessment.positioning : 68,
        overallScore: typeof assessment.overallScore === 'number' ? assessment.overallScore : 71,
        recommendations: Array.isArray(assessment.recommendations) ? assessment.recommendations : [
          "加强基础控球练习",
          "提高传球准确性",
          "增强射门力量训练",
          "改善跑位意识"
        ]
      };
      
      console.log('处理后的技能评估:', assessment);
      
    } catch (parseError) {
      console.error('技能评估JSON解析失败:', parseError);
      console.log('使用默认技能评估');
      
      // 使用默认评估
      assessment = {
        passingAccuracy: 75,
        ballControl: 70,
        shootingPower: 72,
        positioning: 68,
        overallScore: 71,
        recommendations: [
          "加强基础控球练习",
          "提高传球准确性",
          "增强射门力量训练",
          "改善跑位意识"
        ]
      };
    }
    
    res.json({ success: true, assessment });
  } catch (error) {
    console.error('技能评估错误:', error);
    res.status(500).json({ error: '技能评估失败', details: error.message });
  }
});

// 训练计划生成
app.post('/api/ai/training-plan', async (req, res) => {
  try {
    const { age, level, goals, trainingYears, specialGoals, availableTime } = req.body;
    
    console.log('训练计划生成请求参数:', { age, level, goals, trainingYears, specialGoals, availableTime });
    
    const dailyMinutes = Math.round((parseInt(availableTime) || 5) * 60 / 7);
    const prompt = `
你是一名专业青训足球教练，请根据以下球员的具体情况制定科学、个性化的训练计划。

球员信息：
- 年龄：${age || '未知'}岁
- 当前水平：${level || '未知'}
- 训练年限：${trainingYears || '未知'}年
- 训练目标：${goals || '未知'}
- 专项目标：${specialGoals || '无'}
- 每周可用训练时间：${availableTime || '未知'}小时

请严格按照以下要求输出训练计划：
1. trainingGoals字段必须直接使用用户输入的训练目标（如：${goals}）和专项目标（如：${specialGoals}），不要输出"具体目标1/2/3"这类占位词。
2. focusAreas字段必须结合用户输入的训练目标和专项目标，生成与之高度相关的专项内容，不要输出"重点专项1/2/3"这类占位词。
3. 每一天的训练内容都必须与训练目标（如：${goals}）或专项目标（如：${specialGoals}）强相关，不能只在部分天体现，不能输出与目标无关的内容。每一天请明确指出与哪个目标或专项相关，并在内容中用括号注明，如"传球练习（目标：改善传球技术）"。
4. 请将所有训练目标和专项目标均匀分配到每周各天，确保每个目标/专项都被多次体现，避免内容重复和模板化。
5. 示例：
{
  "trainingGoals": ["改善传球技术", "提高传球准确率"],
  "focusAreas": ["传球准确性训练", "控球技巧提升"],
  "weeklySchedule": {
    "monday": "传球练习（目标：改善传球技术）：分组对抗传球，提升传球成功率（${dailyMinutes}分钟）",
    "tuesday": "控球训练（目标：提高传球准确率）：小范围控球、转身突破（${dailyMinutes}分钟）",
    ...
  }
}
6. notes字段必须为字符串或字符串数组，不能为对象或带key结构。
7. 必须严格使用英文逗号、英文引号输出JSON，不能有中文标点、分号或全角符号。

训练时间分配要求：
- 每周总训练时间不得超过${availableTime || '未知'}小时
- 每天训练时间根据年龄和水平合理分配
- 必须包含休息日，避免过度训练
- 训练时间要具体到分钟

针对性训练要求：
- 如果训练目标包含"射门技术"，必须安排射门练习、射门技巧训练等
- 如果训练目标包含"传球技术"，必须安排传球练习、传球准确性训练等
- 如果训练目标包含"控球技术"，必须安排控球练习、控球技巧训练等
- 如果训练目标包含"防守技术"，必须安排防守练习、防守站位训练等
- 如果训练目标包含"体能"，必须安排体能训练、耐力训练等
- 如果训练目标包含"速度"，必须安排速度训练、爆发力训练等
- 如果训练目标包含"战术理解"，必须安排战术训练、战术分析等
- 如果训练目标包含"团队配合"，必须安排团队训练、配合练习等

专项训练要求：
- 如果专项目标是"前锋"，必须安排射门练习、跑位训练、进攻配合等
- 如果专项目标是"中场"，必须安排传球练习、控球训练、战术理解等
- 如果专项目标是"后卫"，必须安排防守练习、防守站位、 防守技巧等
- 如果专项目标是"门将"，必须安排扑救练习、门将技术、门将反应等
- 如果专项目标是"边锋"，必须安排边路突破、传中练习、速度训练等
- 如果专项目标是"中锋"，必须安排射门练习、头球训练、背身拿球等
- 如果专项目标是"后腰"，必须安排防守练习、拦截训练、传球组织等
- 如果专项目标是"中后卫"，必须安排防守练习、头球训练、防守站位等
- 如果专项目标是"边后卫"，必须安排防守练习、边路突破、传中练习等

请严格按照以下JSON格式输出，不要添加任何其他内容，不要包含任何注释：
{
  "trainingGoals": ["具体目标1", "具体目标2", "具体目标3"],
  "weeklySchedule": {
    "monday": "具体训练内容（包含具体时间）",
    "tuesday": "具体训练内容（包含具体时间）", 
    "wednesday": "具体训练内容（包含具体时间）",
    "thursday": "具体训练内容（包含具体时间）",
    "friday": "具体训练内容（包含具体时间）",
    "saturday": "具体训练内容（包含具体时间）",
    "sunday": "具体训练内容（包含具体时间）"
  },
  "focusAreas": ["重点专项1", "重点专项2", "重点专项3"],
  "intensity": "训练强度描述",
  "specialAdvice": ["专项建议1", "专项建议2", "专项建议3"],
  "notes": "注意事项和提醒"
}

重要提醒：
1. 必须严格按照上述JSON格式输出
2. 不要添加任何注释、说明或其他文字
3. 所有字符串必须用双引号包围
4. 不要在JSON中添加任何额外的字段
5. 确保JSON格式完全正确，可以被直接解析
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
      trainingPlan = JSON.parse(response.message.content);
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
      
      // 处理weeklySchedule，确保每天都有训练内容
      const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const allUserGoals = [goals, specialGoals].filter(Boolean).flatMap(s => s.split(/[，,、]/).map(x => x.trim())).filter(Boolean);
      
      weekDays.forEach((day, idx) => {
        if (!trainingPlan.weeklySchedule[day] || trainingPlan.weeklySchedule[day].length < 5) {
          const goal = allUserGoals[idx % allUserGoals.length] || '综合训练';
          trainingPlan.weeklySchedule[day] = `今日训练：${goal}练习，时长${dailyMinutes}分钟`;
        }
      });
      
      // 处理notes字段，确保是字符串
      if (Array.isArray(trainingPlan.notes)) {
        trainingPlan.notes = trainingPlan.notes.map(n => typeof n === 'string' ? n : JSON.stringify(n)).join('；');
      }
      
      // 处理specialAdvice字段，确保是字符串数组
      if (Array.isArray(trainingPlan.specialAdvice)) {
        trainingPlan.specialAdvice = trainingPlan.specialAdvice.map(advice => 
          typeof advice === 'string' ? advice : JSON.stringify(advice)
        );
      }
      
      console.log('处理后的训练计划:', trainingPlan);
      
    } catch (parseError) {
      console.error('AI响应JSON解析失败:', parseError);
      console.log('使用基于输入参数的默认训练计划');
      
      // 使用默认训练计划
      trainingPlan = generateDefaultTrainingPlan(age, level, goals, trainingYears, specialGoals, availableTime);
    }
    
    res.json({ success: true, trainingPlan });
  } catch (error) {
    console.error('训练计划生成错误:', error);
    res.status(500).json({ error: '训练计划生成失败', details: error.message });
  }
});

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
  
  // 验证规则
  const isValid = 
    totalMinutes > 0 && // 有训练时间
    totalMinutes <= targetMinutes * 1.2 && // 不超过目标时间的120%
    totalMinutes >= targetMinutes * 0.8 && // 不少于目标时间的80%
    trainingDays >= 3 && // 至少训练3天
    trainingDays <= 6; // 最多训练6天
  
  return {
    isValid,
    totalMinutes,
    targetMinutes,
    trainingDays,
    difference: totalMinutes - targetMinutes,
    percentage: Math.round((totalMinutes / targetMinutes) * 100)
  };
}

// 生成基于输入参数的默认训练计划
function generateDefaultTrainingPlan(age, level, goals, trainingYears, specialGoals, availableTime) {
  const ageNum = parseInt(age) || 10;
  const trainingYearsNum = parseInt(trainingYears) || 1;
  const availableTimeNum = parseInt(availableTime) || 5;
  
  console.log('生成默认训练计划参数:', { ageNum, trainingYearsNum, availableTimeNum, goals, specialGoals });
  
  // 根据年龄调整训练内容
  let intensity = "中等";
  let focusAreas = ["基础技术", "体能训练"];
  
  if (ageNum < 8) {
    intensity = "轻松";
    focusAreas = ["基础控球", "协调性", "团队合作"];
  } else if (ageNum < 12) {
    intensity = "中等";
    focusAreas = ["技术训练", "战术理解", "体能基础"];
  } else {
    intensity = "较高";
    focusAreas = ["专项技术", "战术执行", "体能强化"];
  }
  
  // 根据训练年限调整
  if (trainingYearsNum < 2) {
    focusAreas = ["基础技能", "规则理解", "团队配合"];
  } else if (trainingYearsNum > 3) {
    focusAreas = ["高级技术", "战术分析", "比赛经验"];
  }
  
  // 根据专项目标调整
  if (specialGoals) {
    const goals = specialGoals.split(',').map(g => g.trim());
    focusAreas = [...focusAreas, ...goals];
  }
  
  // 根据可用时间和年龄合理分配训练时间
  let trainingDays = 5; // 默认训练5天
  let restDays = 2; // 休息2天
  
  // 根据年龄调整训练天数
  if (ageNum < 8) {
    trainingDays = 3; // 小年龄训练3天
    restDays = 4;
  } else if (ageNum < 12) {
    trainingDays = 4; // 中等年龄训练4天
    restDays = 3;
  } else {
    trainingDays = 5; // 大年龄训练5天
    restDays = 2;
  }
  
  // 根据可用时间调整训练天数
  if (availableTimeNum < 3) {
    trainingDays = Math.min(trainingDays, 3);
  } else if (availableTimeNum < 6) {
    trainingDays = Math.min(trainingDays, 4);
  }
  
  // 计算每天训练时间（小时转分钟）
  const totalTrainingMinutes = availableTimeNum * 60; // 总训练分钟数
  const dailyTrainingMinutes = Math.floor(totalTrainingMinutes / trainingDays); // 每天训练分钟数
  
  console.log('时间分配:', { 
    availableTimeNum, 
    trainingDays, 
    restDays, 
    totalTrainingMinutes, 
    dailyTrainingMinutes 
  });
  
  // 根据训练目标和专项目标生成针对性的训练内容
  const trainingGoalsList = goals ? goals.split(',').map(g => g.trim()) : ["提升基础技能", "增强体能", "改善团队配合"];
  const specialGoalsList = specialGoals ? specialGoals.split(',').map(g => g.trim()) : [];
  
  // 创建针对性的训练类型映射
  const goalTrainingMap = {
    "提升射门技术": ["射门练习", "射门技巧训练", "射门力量训练"],
    "提升传球技术": ["传球练习", "传球准确性训练", "传球技巧训练"],
    "提升控球技术": ["控球练习", "控球技巧训练", "控球稳定性训练"],
    "提升防守技术": ["防守练习", "防守站位训练", "防守技巧训练"],
    "提升体能": ["体能训练", "耐力训练", "力量训练"],
    "提升速度": ["速度训练", "爆发力训练", "敏捷性训练"],
    "提升战术理解": ["战术训练", "战术分析", "战术执行"],
    "提升团队配合": ["团队训练", "配合练习", "团队战术"],
    "提升比赛经验": ["实战练习", "模拟比赛", "比赛分析"],
    "提升心理素质": ["心理训练", "压力训练", "自信心训练"]
  };
  
  // 根据专项目标生成更具体的训练内容
  const specialGoalTrainingMap = {
    "前锋": ["射门练习", "跑位训练", "进攻配合", "射门技巧"],
    "中场": ["传球练习", "控球训练", "战术理解", "组织进攻"],
    "后卫": ["防守练习", "防守站位", "防守技巧", "防守配合"],
    "门将": ["扑救练习", "门将技术", "门将反应", "门将指挥"],
    "边锋": ["边路突破", "传中练习", "速度训练", "边路配合"],
    "中锋": ["射门练习", "头球训练", "背身拿球", "进攻配合"],
    "后腰": ["防守练习", "拦截训练", "传球组织", "防守指挥"],
    "中后卫": ["防守练习", "头球训练", "防守站位", "防守指挥"],
    "边后卫": ["防守练习", "边路突破", "传中练习", "防守配合"]
  };
  
  // 生成每周训练安排
  const weeklySchedule = {};
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // 根据训练目标生成训练内容
  let allTrainingTypes = [];
  
  // 添加基础训练类型
  allTrainingTypes.push("基础技术训练");
  
  // 根据训练目标添加针对性训练
  trainingGoalsList.forEach(goal => {
    if (goalTrainingMap[goal]) {
      allTrainingTypes.push(...goalTrainingMap[goal]);
    }
  });
  
  // 根据专项目标添加专项训练
  specialGoalsList.forEach(specialGoal => {
    if (specialGoalTrainingMap[specialGoal]) {
      allTrainingTypes.push(...specialGoalTrainingMap[specialGoal]);
    }
  });
  
  // 添加通用训练类型
  allTrainingTypes.push("体能训练", "战术训练", "实战练习");
  
  // 去重并限制数量
  allTrainingTypes = [...new Set(allTrainingTypes)].slice(0, trainingDays);
  
  console.log('生成的训练类型:', allTrainingTypes);
  
  weekDays.forEach((day, index) => {
    if (index < trainingDays) {
      // 训练日 - 使用针对性的训练内容
      const trainingType = allTrainingTypes[index] || "综合训练";
      weeklySchedule[day] = `${trainingType} ${dailyTrainingMinutes}分钟`;
    } else {
      // 休息日
      weeklySchedule[day] = "休息";
    }
  });
  
  // 验证总训练时间
  const totalScheduledMinutes = Object.values(weeklySchedule)
    .filter(day => day !== "休息")
    .reduce((total, day) => {
      const match = day.match(/(\d+)分钟/);
      return total + (match ? parseInt(match[1]) : 0);
    }, 0);
  
  console.log('验证训练时间:', { 
    scheduledMinutes: totalScheduledMinutes, 
    targetMinutes: totalTrainingMinutes,
    difference: totalScheduledMinutes - totalTrainingMinutes 
  });
  
  // 生成针对性的建议
  const specialAdvice = [
    `根据${ageNum}岁年龄特点调整训练强度`,
    `每周训练${availableTimeNum}小时，共${totalScheduledMinutes}分钟，注意劳逸结合`
  ];
  
  // 根据训练目标添加针对性建议
  if (trainingGoalsList.length > 0) {
    specialAdvice.push(`重点训练目标：${trainingGoalsList.join('、')}`);
  }
  
  // 根据专项目标添加专项建议
  if (specialGoalsList.length > 0) {
    specialAdvice.push(`专项训练：${specialGoalsList.join('、')}`);
  }
  
  return {
    trainingGoals: trainingGoalsList,
    weeklySchedule: weeklySchedule,
    focusAreas: focusAreas,
    intensity: intensity,
    specialAdvice: specialAdvice,
    notes: `适合${ageNum}岁、训练${trainingYearsNum}年的${level || '初学者'}球员，每周可用${availableTimeNum}小时训练，实际安排${totalScheduledMinutes}分钟。训练重点：${trainingGoalsList.join('、')}${specialGoalsList.length > 0 ? `，专项：${specialGoalsList.join('、')}` : ''}`
  };
}

// 营养建议
app.post('/api/ai/nutrition-advice', async (req, res) => {
  try {
    const { age, weight, height, intensity, duration, frequency, dietTaboo, specialNeeds } = req.body;
    
    console.log('营养建议生成请求参数:', { age, weight, height, intensity, duration, frequency, dietTaboo, specialNeeds });
    
    const prompt = `
你是一名专业运动营养师，请根据以下小球员的具体情况制定科学的、个性化的营养建议。

球员信息：
- 年龄：${age || '未知'}岁
- 体重：${weight || '未知'}kg
- 身高：${height || '未知'}cm
- 饮食禁忌：${dietTaboo || '无'}
- 特殊需求：${specialNeeds || '无'}

训练数据：
- 训练强度：${intensity || '未知'}
- 训练时长：${duration || '未知'}小时/周
- 训练频率：${frequency || '未知'}次/周

请根据以上信息，制定一个详细的、个性化的营养方案。注意：
1. 根据年龄调整营养需求和食物选择
2. 根据体重和身高计算基础代谢率
3. 根据训练强度调整热量摄入
4. 根据训练时长和频率调整营养配比
5. 考虑饮食禁忌和特殊需求
6. 提供适合青少年的食物选择

请严格按照以下JSON格式输出，不要添加任何其他内容，不要包含任何注释：
{
  "dailyCalories": "具体热量数值",
  "macronutrients": {
    "protein": "蛋白质需求范围",
    "carbs": "碳水化合物需求范围", 
    "fats": "脂肪需求范围"
  },
  "preTraining": "训练前具体饮食建议",
  "postTraining": "训练后具体饮食建议",
  "supplements": ["补充剂1", "补充剂2", "补充剂3"],
  "dietTabooAdvice": "针对饮食禁忌的具体建议",
  "sampleMenu": ["早餐具体建议", "午餐具体建议", "晚餐具体建议"],
  "notes": "注意事项和提醒"
}
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
      nutritionAdvice = JSON.parse(response.message.content);
      console.log('营养建议AI响应解析成功:', nutritionAdvice);
      
      // 验证和清理数据格式
      nutritionAdvice = {
        dailyCalories: typeof nutritionAdvice.dailyCalories === 'string' ? nutritionAdvice.dailyCalories : '2000',
        macronutrients: typeof nutritionAdvice.macronutrients === 'object' ? nutritionAdvice.macronutrients : {
          protein: '80g',
          carbs: '250g',
          fats: '60g'
        },
        preTraining: typeof nutritionAdvice.preTraining === 'string' ? nutritionAdvice.preTraining : '训练前2小时：全麦面包+香蕉',
        postTraining: typeof nutritionAdvice.postTraining === 'string' ? nutritionAdvice.postTraining : '训练后30分钟内：蛋白质奶昔+水果',
        supplements: Array.isArray(nutritionAdvice.supplements) ? nutritionAdvice.supplements : ['维生素D', '钙片'],
        dietTabooAdvice: typeof nutritionAdvice.dietTabooAdvice === 'string' ? nutritionAdvice.dietTabooAdvice : '保持均衡饮食',
        sampleMenu: Array.isArray(nutritionAdvice.sampleMenu) ? nutritionAdvice.sampleMenu : ['早餐：燕麦+鸡蛋', '午餐：米饭+鸡胸肉+蔬菜', '晚餐：意面+牛肉+水果'],
        notes: typeof nutritionAdvice.notes === 'string' ? nutritionAdvice.notes : '根据训练强度调整热量摄入'
      };
      
      console.log('处理后的营养建议:', nutritionAdvice);
      
    } catch (parseError) {
      console.error('营养建议JSON解析失败:', parseError);
      console.log('使用基于输入参数的默认营养建议');
      
      // 使用基于输入参数的默认营养建议
      nutritionAdvice = generateDefaultNutritionAdvice(age, weight, height, intensity, duration, frequency, dietTaboo, specialNeeds);
    }
    
    res.json({ success: true, nutritionAdvice });
  } catch (error) {
    console.error('营养建议生成错误:', error);
    res.status(500).json({ error: '营养建议生成失败', details: error.message });
  }
});

// 生成基于输入参数的默认营养建议
function generateDefaultNutritionAdvice(age, weight, height, intensity, duration, frequency, dietTaboo, specialNeeds) {
  const ageNum = parseInt(age) || 12;
  const weightNum = parseInt(weight) || 45;
  const heightNum = parseInt(height) || 150;
  const durationNum = parseInt(duration) || 5;
  const frequencyNum = parseInt(frequency) || 3;
  
  // 根据年龄和体重计算基础热量需求
  let baseCalories = 0;
  if (ageNum < 10) {
    baseCalories = 1200 + (weightNum * 15);
  } else if (ageNum < 14) {
    baseCalories = 1400 + (weightNum * 18);
  } else {
    baseCalories = 1600 + (weightNum * 20);
  }
  
  // 根据训练强度调整热量
  let intensityMultiplier = 1.0;
  if (intensity === '低强度') {
    intensityMultiplier = 1.1;
  } else if (intensity === '中等强度') {
    intensityMultiplier = 1.3;
  } else if (intensity === '高强度') {
    intensityMultiplier = 1.5;
  }
  
  // 根据训练时长调整
  const durationMultiplier = 1 + (durationNum / 10);
  
  const dailyCalories = Math.round(baseCalories * intensityMultiplier * durationMultiplier);
  
  // 根据训练强度调整营养素配比
  let proteinRatio, carbsRatio, fatsRatio;
  if (intensity === '高强度') {
    proteinRatio = 0.25; // 25% 蛋白质
    carbsRatio = 0.55;   // 55% 碳水化合物
    fatsRatio = 0.20;    // 20% 脂肪
  } else if (intensity === '中等强度') {
    proteinRatio = 0.20; // 20% 蛋白质
    carbsRatio = 0.60;   // 60% 碳水化合物
    fatsRatio = 0.20;    // 20% 脂肪
  } else {
    proteinRatio = 0.15; // 15% 蛋白质
    carbsRatio = 0.65;   // 65% 碳水化合物
    fatsRatio = 0.20;    // 20% 脂肪
  }
  
  const protein = Math.round((dailyCalories * proteinRatio) / 4); // 1g蛋白质=4卡路里
  const carbs = Math.round((dailyCalories * carbsRatio) / 4);     // 1g碳水化合物=4卡路里
  const fats = Math.round((dailyCalories * fatsRatio) / 9);       // 1g脂肪=9卡路里
  
  // 根据年龄调整补充剂
  let supplements = ["维生素D"];
  if (ageNum < 12) {
    supplements.push("钙片", "维生素C");
  } else {
    supplements.push("钙片", "维生素C", "复合维生素B");
  }
  
  // 根据饮食禁忌调整建议
  let dietTabooAdvice = "保持均衡饮食，避免高糖高脂食物";
  if (dietTaboo) {
    dietTabooAdvice = `严格避免${dietTaboo}，选择替代食物补充营养`;
  }
  
  // 根据特殊需求调整
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
    preTraining: `训练前2小时：全麦面包+香蕉+牛奶，训练前30分钟：能量棒或水果`,
    postTraining: `训练后30分钟内：蛋白质奶昔+香蕉，训练后2小时：米饭+鸡胸肉+蔬菜`,
    supplements: supplements,
    dietTabooAdvice: dietTabooAdvice,
    sampleMenu: [
      `早餐：燕麦粥+鸡蛋+牛奶+水果（适合${ageNum}岁青少年）`,
      `午餐：米饭+鸡胸肉+蔬菜+汤（根据${intensity || '中等'}强度训练调整）`,
      `晚餐：意面+牛肉+蔬菜+水果（每周${frequencyNum}次训练的营养补充）`
    ],
    notes: `${specialNotes}，适合${ageNum}岁、${weightNum}kg的青少年，每周训练${durationNum}小时`
  };
}

// 技能测试数据分析
app.post('/api/ai/skill-test-analysis', async (req, res) => {
  try {
    const { basic, physical, skills, match } = req.body;
    
    // 检查Ollama服务是否可用
    try {
      await ollama.list();
    } catch (error) {
      return res.status(503).json({ 
        error: 'AI服务暂时不可用，请确保Ollama已启动',
        details: '请运行: ollama serve 启动AI服务'
      });
    }

    // 构建详细的分析提示
    const prompt = `
    作为专业的足球教练和数据分析师，请基于以下客观测试数据对小球员进行综合评估：

    基础信息：
    - 姓名：${basic.name || '未知'}
    - 年龄：${basic.age || '未知'}岁
    - 位置：${basic.position || '未知'}
    - 身高：${basic.height || '未知'}cm
    - 体重：${basic.weight || '未知'}kg
    - 训练年限：${basic.trainingYears || '未知'}

    体能测试数据：
    - 30米冲刺：${physical.sprint30m || '未知'}秒
    - 50米冲刺：${physical.sprint50m || '未知'}秒
    - 100米冲刺：${physical.sprint100m || '未知'}秒
    - 12分钟跑：${physical.run12min || '未知'}米
    - YoYo测试：${physical.yoyoTest || '未知'}级数
    - 折返跑：${physical.shuttleRun || '未知'}秒
    - 立定跳远：${physical.longJump || '未知'}厘米
    - 引体向上：${physical.pullUps || '未知'}个
    - 深蹲：${physical.squat || '未知'}公斤

    足球专项技能：
    - 颠球次数：${skills.juggling || '未知'}个
    - 控球时间：${skills.ballControl || '未知'}秒
    - 变向控球：${skills.dribbling || '未知'}秒
    - 短传准确率：${skills.shortPass || '未知'}%
    - 长传准确率：${skills.longPass || '未知'}%
    - 传球速度：${skills.passSpeed || '未知'}秒
    - 射门准确率：${skills.shootingAccuracy || '未知'}%
    - 射门力量：${skills.shootingPower || '未知'}km/h
    - 射门距离：${skills.shootingDistance || '未知'}米

    比赛表现数据：
    - 比赛场次：${match.games || '未知'}场
    - 上场时间：${match.minutes || '未知'}分钟
    - 进球数：${match.goals || '未知'}个
    - 助攻数：${match.assists || '未知'}个
    - 传球次数：${match.passes || '未知'}次
    - 传球成功率：${match.passRate || '未知'}%

    请从以下方面进行专业评估：

    1. 体能评估 (0-100分)：
       - 速度能力评分
       - 耐力能力评分
       - 力量能力评分
       - 综合体能评分

    2. 技术评估 (0-100分)：
       - 控球技术评分
       - 传球技术评分
       - 射门技术评分
       - 综合技术评分

    3. 比赛表现评估 (0-100分)：
       - 进攻能力评分
       - 防守能力评分
       - 团队配合评分
       - 综合表现评分

    4. 整体评估：
       - 综合评分 (0-100分)
       - 优势分析 (3-5条)
       - 不足分析 (3-5条)
       - 改进建议 (5-8条)
       - 发展潜力评估 (高/中/低)

    5. 位置适配性：
       - 当前位置适配度 (0-100分)
       - 其他位置建议
       - 位置转换建议

    请以JSON格式返回，包含所有评分、分析和建议。
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

    // 解析AI响应
    let analysis;
    
    // 简化的JSON解析策略：直接尝试解析，失败则使用默认分析
    try {
      // 直接尝试解析AI响应
      analysis = JSON.parse(response.message.content);
      console.log('技能测试分析AI响应解析成功:', analysis);
      
      // 验证和清理数据格式
      analysis = {
        physical: typeof analysis.physical === 'object' ? analysis.physical : {
          speed: 75,
          endurance: 70,
          strength: 72,
          overall: 72
        },
        technical: typeof analysis.technical === 'object' ? analysis.technical : {
          ballControl: 78,
          passing: 75,
          shooting: 70,
          overall: 74
        },
        performance: typeof analysis.performance === 'object' ? analysis.performance : {
          attack: 76,
          defense: 68,
          teamwork: 72,
          overall: 72
        },
        overall: typeof analysis.overall === 'object' ? analysis.overall : {
          score: 73,
          strengths: ["控球技术较好", "传球准确率较高", "比赛经验丰富"],
          weaknesses: ["体能需要提升", "射门力量不足", "防守意识待加强"],
          improvements: ["加强体能训练", "提高射门力量", "改善防守站位", "增加比赛经验"],
          potential: "中",
          positionFit: 80,
          positionSuggestions: ["当前位置适配度良好", "可考虑尝试中场位置"],
          recommendations: ["继续加强基础训练", "参加更多比赛积累经验"]
        }
      };
      
      console.log('处理后的技能测试分析:', analysis);
      
    } catch (parseError) {
      console.error('技能测试分析JSON解析失败:', parseError);
      console.log('使用默认技能测试分析');
      
      // 使用默认分析
      analysis = {
        physical: {
          speed: 75,
          endurance: 70,
          strength: 72,
          overall: 72
        },
        technical: {
          ballControl: 78,
          passing: 75,
          shooting: 70,
          overall: 74
        },
        performance: {
          attack: 76,
          defense: 68,
          teamwork: 72,
          overall: 72
        },
        overall: {
          score: 73,
          strengths: ["控球技术较好", "传球准确率较高", "比赛经验丰富"],
          weaknesses: ["体能需要提升", "射门力量不足", "防守意识待加强"],
          improvements: ["加强体能训练", "提高射门力量", "改善防守站位", "增加比赛经验"],
          potential: "中",
          positionFit: 80,
          positionSuggestions: ["当前位置适配度良好", "可考虑尝试中场位置"],
          recommendations: ["继续加强基础训练", "参加更多比赛积累经验"]
        }
      };
    }
    
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('技能测试分析错误:', error);
    res.status(500).json({ error: '技能测试分析失败', details: error.message });
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

// 辅助函数：计算各项评分
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

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
});