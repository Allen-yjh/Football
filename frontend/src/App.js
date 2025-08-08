import React, { useState } from 'react';
import { Layout, Menu, Button, Row, Col, Typography, Image, Modal, Form, Input, DatePicker, Select, message, Upload, Table, Tabs, Radio } from 'antd';
import { UserOutlined, TeamOutlined, TrophyOutlined, LoginOutlined, RobotOutlined, TeamOutlined as CommunityOutlined, UploadOutlined } from '@ant-design/icons';
import './index.css';
import axios from 'axios';
import image1 from './images/image1.png';
import image2 from './images/image2.png';
import image3 from './images/image3.png';
import image4 from './images/image4.png';
import image5 from './images/image5.png';
import image6 from './images/image6.png';
import image7 from './images/image7.png';
import image8 from './images/image8.png';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 占位小将logo
const logoUrl = 'https://cdn-icons-png.flaticon.com/512/861/861512.png';
// 占位小球员照片
const playerPhotos = [
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
  image7,
  image8,
];

function App() {
  const [modal, setModal] = useState(null); // 'player' | 'coach' | 'login' | null
  const [form] = Form.useForm();
  const [coachForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [page, setPage] = useState('home'); // 'home' | 'player-upload' | 'coach-view' | 'ai-interaction' | 'parent-community' | 'player-assessment' | 'new-topic' | 'topic-detail'
  const [user, setUser] = useState(null); // {role, name}

  // 小将上传照片/视频功能
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState({ photo: null, video: null });

  // 教练查看所有小将信息
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // AI互动页面状态
  const [aiActiveTab, setAiActiveTab] = useState('training');
  const [aiFormData, setAiFormData] = useState({
    assessment: {},
    training: {},
    nutrition: { gender: '' }
  });
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState(false);

  // 家长社区状态
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [newTopicForm] = Form.useForm();
  const [publishingTopic, setPublishingTopic] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loadingTopicDetail, setLoadingTopicDetail] = useState(false);
  const [replyForm] = Form.useForm();
  const [submittingReply, setSubmittingReply] = useState(false);
  const [aiQuestionForm] = Form.useForm();
  const [askingAI, setAskingAI] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');

  // 1. 新增presetTag和tagFilter状态
  const [presetTag, setPresetTag] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  // 投票相关状态
  const VOTE_KEY = 'parent_community_vote';
  const [voteState, setVoteState] = useState(() => localStorage.getItem(VOTE_KEY) || '');
  const [voteResult, setVoteResult] = useState(() => {
    // 默认初始票数
    const stored = localStorage.getItem(VOTE_KEY + '_result');
    return stored ? JSON.parse(stored) : { tech: 8, body: 7 };
  });
  const [voteLoading, setVoteLoading] = useState(false);

  // 颠球挑战页面状态
  const [challengeVideo, setChallengeVideo] = useState(null);
  const [challengeUploading, setChallengeUploading] = useState(false);
  const [challengeDesc, setChallengeDesc] = useState('');

  const handleVote = (type) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    if (voteState) {
      message.info('您已投票');
      return;
    }
    setVoteLoading(true);
    setTimeout(() => {
      const newResult = { ...voteResult };
      if (type === 'tech') newResult.tech += 1;
      else if (type === 'body') newResult.body += 1;
      setVoteResult(newResult);
      setVoteState(type);
      localStorage.setItem(VOTE_KEY, type);
      localStorage.setItem(VOTE_KEY + '_result', JSON.stringify(newResult));
      setVoteLoading(false);
      message.success('投票成功！');
    }, 600);
  };

  const handleUpload = async () => {
    if (!photoFile && !videoFile) {
      message.warning('请至少上传一张照片或一个视频');
      return;
    }
    const formData = new FormData();
    if (photoFile) formData.append('photo', photoFile);
    if (videoFile) formData.append('video', videoFile);
    setUploading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploaded({ photo: res.data.photo, video: res.data.video });
      setPhotoFile(null);
      setVideoFile(null);
      message.success('上传成功！');
    } catch (err) {
      message.error(err.response?.data?.error || '上传失败');
    }
    setUploading(false);
  };

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const res = await axios.get('http://localhost:3001/api/players');
      setPlayers(res.data);
    } catch (err) {
      message.error('获取小将信息失败');
    }
    setLoadingPlayers(false);
  };

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await axios.get('http://localhost:3001/api/topics');
      setTopics(res.data);
    } catch (err) {
      message.error('获取话题列表失败');
    }
    setLoadingTopics(false);
  };

  const handlePublishTopic = async (values) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    
    setPublishingTopic(true);
    try {
      let uploadedFiles = [];
      
      // 如果有上传文件，先上传
      if (photoFile || videoFile) {
        const formData = new FormData();
        if (photoFile) formData.append('photo', photoFile);
        if (videoFile) formData.append('video', videoFile);
        
        const uploadRes = await axios.post('http://localhost:3001/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        if (uploadRes.data.photo) uploadedFiles.push(`照片：${uploadRes.data.photo}`);
        if (uploadRes.data.video) uploadedFiles.push(`视频：${uploadRes.data.video}`);
      }
      
      // 构建话题内容，包含上传文件信息
      let content = values.content;
      if (uploadedFiles.length > 0) {
        content += `\n\n📎 附件：${uploadedFiles.join(', ')}`;
      }
      
      const topicData = {
        title: values.title,
        content: content,
        author: user.name,
        authorRole: user.role === 'player' ? '小将' : '教练',
        tags: values.tags ? values.tags.split(/[,，、]/).map(tag => tag.trim()).filter(tag => tag) : []
      };
      
      await axios.post('http://localhost:3001/api/topics', topicData);
      message.success('话题发布成功！');
      newTopicForm.resetFields();
      setPhotoFile(null);
      setVideoFile(null);
      setPage('parent-community');
      fetchTopics(); // 刷新话题列表
    } catch (err) {
      message.error(err.response?.data?.error || '发布话题失败');
    }
    setPublishingTopic(false);
  };

  const fetchTopicDetail = async (topicId) => {
    setLoadingTopicDetail(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/topics/${topicId}`);
      setCurrentTopic(res.data);
    } catch (err) {
      message.error('获取话题详情失败');
    }
    setLoadingTopicDetail(false);
  };

  const handleReply = async (values) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    
    if (!currentTopic) {
      message.error('话题信息错误');
      return;
    }
    
    setSubmittingReply(true);
    try {
      const replyData = {
        content: values.content,
        author: user.name,
        authorRole: user.role === 'player' ? '小将' : '教练'
      };
      
      await axios.post(`http://localhost:3001/api/topics/${currentTopic.id}/replies`, replyData);
      message.success('回复成功！');
      replyForm.resetFields();
      // 刷新话题详情
      fetchTopicDetail(currentTopic.id);
    } catch (err) {
      message.error(err.response?.data?.error || '回复失败');
    }
    setSubmittingReply(false);
  };

  const handleLike = async (topicId) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    
    try {
      await axios.post(`http://localhost:3001/api/topics/${topicId}/like`);
      // 刷新话题详情或列表
      if (currentTopic && currentTopic.id === topicId) {
        fetchTopicDetail(topicId);
      } else {
        fetchTopics();
      }
    } catch (err) {
      message.error('点赞失败');
    }
  };

  const handleAskAI = async (values) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    
    setAskingAI(true);
    try {
      const prompt = `你是一名专业的青少年足球教练和营养师，请针对以下家长问题提供专业、实用的建议：

问题：${values.question}

请从以下几个方面给出建议：
1. 专业分析
2. 具体建议
3. 注意事项
4. 相关资源推荐

回答要简洁明了，适合家长理解。`;

      const response = await axios.post('http://localhost:3001/api/ai/training-plan', {
        age: 10,
        level: '初学者',
        goals: values.question,
        trainingYears: 1,
        specialGoals: '综合训练',
        availableTime: 5
      });

      // 这里我们复用训练计划的AI接口，但实际上应该创建一个专门的问答接口
      // 为了演示，我们直接生成一个模拟的回答
      const mockAnswer = `根据您的问题"${values.question}"，我建议：

1. **专业分析**：这是很多家长都会遇到的问题，需要从多个角度来考虑。

2. **具体建议**：
   - 循序渐进，不要急于求成
   - 注重基础训练，打好基本功
   - 保持孩子的兴趣和积极性
   - 合理安排训练时间和强度

3. **注意事项**：
   - 避免过度训练导致孩子厌烦
   - 注意孩子的身体反应
   - 与教练保持良好沟通

4. **相关资源**：建议查看我们的训练计划生成功能，可以获得更个性化的建议。`;

      setAiAnswer(mockAnswer);
      aiQuestionForm.resetFields();
      message.success('AI助手已为您解答！');
    } catch (err) {
      message.error('AI答疑失败，请稍后重试');
    }
    setAskingAI(false);
  };

  React.useEffect(() => {
    if (page === 'coach-view') {
      fetchPlayers();
    }
    if (page === 'parent-community') {
      fetchTopics();
    }
    // eslint-disable-next-line
  }, [page]);

  const playerColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender' },
    { title: '出生日期', dataIndex: 'birthday', key: 'birthday' },
    { title: '身高', dataIndex: 'height', key: 'height' },
    { title: '司职', dataIndex: 'position', key: 'position' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
  ];

  // 小将注册表单内容
  const renderPlayerForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={async values => {
        const data = { ...values, birthday: values.birthday?.format('YYYY-MM-DD') };
        try {
          await axios.post('http://localhost:3001/api/player/register', data);
          setModal(null);
          form.resetFields();
          message.success('注册成功！');
        } catch (err) {
          message.error(err.response?.data?.error || '注册失败');
        }
      }}
    >
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
      <Form.Item label="性别" name="gender" rules={[{ required: true, message: '请选择性别' }]}><Select><Option value="男">男</Option><Option value="女">女</Option></Select></Form.Item>
      <Form.Item label="出生日期" name="birthday" rules={[{ required: true, message: '请选择出生日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="身高(cm)" name="height" rules={[{ required: true, message: '请输入身高' }]}><Input type="number" /></Form.Item>
      <Form.Item label="司职" name="position" rules={[{ required: true, message: '请选择司职' }]}>
        <Select placeholder="请选择司职">
          <Option value="前锋">前锋</Option>
          <Option value="中场">中场</Option>
          <Option value="后卫">后卫</Option>
          <Option value="门将">门将</Option>
        </Select>
      </Form.Item>
      <Form.Item label="城市" name="city" rules={[{ required: true, message: '请输入城市' }]}><Select><Option value="北京">北京</Option><Option value="上海">上海</Option><Option value="广州">广州</Option><Option value="深圳">深圳</Option><Option value="其他">其他</Option></Select></Form.Item>
      <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}><Input /></Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" block>提交注册</Button></Form.Item>
    </Form>
  );

  // 教练入驻表单内容
  const renderCoachForm = () => (
    <Form
      form={coachForm}
      layout="vertical"
      onFinish={async values => {
        try {
          await axios.post('http://localhost:3001/api/coach/register', values);
          setModal(null);
          coachForm.resetFields();
          message.success('教练入驻成功！');
        } catch (err) {
          message.error(err.response?.data?.error || '入驻失败');
        }
      }}
    >
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
      <Form.Item label="性别" name="gender" rules={[{ required: true, message: '请选择性别' }]}><Select><Option value="男">男</Option><Option value="女">女</Option></Select></Form.Item>
      <Form.Item label="教练级别" name="level" rules={[{ required: true, message: '请输入教练级别' }]}><Input placeholder="如：国家一级、C级、B级等" /></Form.Item>
      <Form.Item label="俱乐部/学校" name="club" rules={[{ required: true, message: '请输入俱乐部或学校名称' }]}><Input /></Form.Item>
      <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}><Input /></Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" block>提交入驻</Button></Form.Item>
    </Form>
  );

  // 登录表单内容
  const renderLoginForm = () => (
    <Form
      form={loginForm}
      layout="vertical"
      onFinish={async values => {
        try {
          await axios.post('http://localhost:3001/api/login', values);
          setModal(null);
          loginForm.resetFields();
          setUser({ role: values.role, name: values.name });
          if (values.role === 'player') setPage('player-upload');
          else if (values.role === 'coach') setPage('coach-view');
          message.success('登录成功！');
        } catch (err) {
          message.error(err.response?.data?.error || '登录失败');
        }
      }}
    >
      <Form.Item label="身份" name="role" rules={[{ required: true, message: '请选择身份' }]}><Select><Option value="player">小将</Option><Option value="coach">教练</Option></Select></Form.Item>
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" block>登录</Button></Form.Item>
    </Form>
  );

  // 登录后页面
  const renderPlayerUpload = () => (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <Title level={2}>欢迎你，{user?.name}！</Title>
      <Paragraph>请上传你的小将照片和比赛视频：</Paragraph>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <Upload
          beforeUpload={file => {
            setPhotoFile(file);
            return false;
          }}
          accept="image/*"
          maxCount={1}
          showUploadList={photoFile ? [{ name: photoFile.name }] : false}
        >
          <Button icon={<UserOutlined />}>选择照片 (≤1M)</Button>
        </Upload>
        <br /><br />
        <Upload
          beforeUpload={file => {
            setVideoFile(file);
            return false;
          }}
          accept="video/*"
          maxCount={1}
          showUploadList={videoFile ? [{ name: videoFile.name }] : false}
        >
          <Button icon={<UserOutlined />}>选择视频 (≤100M)</Button>
        </Upload>
        <br /><br />
        <Button type="primary" onClick={handleUpload} loading={uploading}>上传</Button>
        {uploaded.photo && <div style={{ marginTop: 16 }}>已上传照片：{uploaded.photo}</div>}
        {uploaded.video && <div style={{ marginTop: 8 }}>已上传视频：{uploaded.video}</div>}
      </div>
      <Button style={{ marginTop: 32 }} onClick={() => { setUser(null); setPage('home'); }}>退出登录</Button>
    </div>
  );
  const renderCoachView = () => (
    <div style={{ maxWidth: 900, margin: '40px auto' }}>
      <Title level={2} style={{ textAlign: 'center' }}>欢迎你，教练{user?.name}！</Title>
      <Paragraph style={{ textAlign: 'center' }}>以下是所有已登记小将信息：</Paragraph>
      <Table
        columns={playerColumns}
        dataSource={players}
        rowKey={(r, i) => i}
        loading={loadingPlayers}
        pagination={{ pageSize: 8 }}
        bordered
        style={{ background: '#fff', borderRadius: 8 }}
      />
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button onClick={() => { setUser(null); setPage('home'); }}>退出登录</Button>
      </div>
    </div>
  );

  // AI表单处理函数
  const handleAiFormChange = (tab, field, value) => {
    setAiFormData(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [field]: value }
    }));
  };

  const handleAiSubmit = async (tab) => {
    setAiLoading(true);
    try {
      let endpoint = '';
      let data = {};
      
      switch(tab) {
        case 'assessment':
          endpoint = '/api/ai/player-assessment';
          
          // 如果有视频文件，先上传视频
          let videoUrl = '';
          if (videoFile) {
            const formData = new FormData();
            formData.append('video', videoFile);
            
            const uploadResponse = await fetch('http://localhost:3001/api/upload-video', {
              method: 'POST',
              body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            if (uploadResult.success) {
              videoUrl = uploadResult.videoUrl;
            } else {
              message.error('视频上传失败：' + uploadResult.error);
              setAiLoading(false);
              return;
            }
          }
          
          data = {
            assessmentType: aiFormData.assessment.type || 'comprehensive',
            basic: {
              name: aiFormData.assessment.name || '',
              age: aiFormData.assessment.age || '',
              position: aiFormData.assessment.position || '',
              height: aiFormData.assessment.height || '',
              weight: aiFormData.assessment.weight || '',
              trainingYears: aiFormData.assessment.trainingYears || ''
            },
            // 客观测试数据
            physical: {
              sprint30m: aiFormData.assessment.sprint30m || '',
              sprint50m: aiFormData.assessment.sprint50m || '',
              sprint100m: aiFormData.assessment.sprint100m || '',
              run12min: aiFormData.assessment.run12min || '',
              yoyoTest: aiFormData.assessment.yoyoTest || '',
              shuttleRun: aiFormData.assessment.shuttleRun || '',
              longJump: aiFormData.assessment.longJump || '',
              pullUps: aiFormData.assessment.pullUps || '',
              squat: aiFormData.assessment.squat || ''
            },
            skills: {
              juggling: aiFormData.assessment.juggling || '',
              ballControl: aiFormData.assessment.ballControl || '',
              dribbling: aiFormData.assessment.dribbling || '',
              shortPass: aiFormData.assessment.shortPass || '',
              longPass: aiFormData.assessment.longPass || '',
              passSpeed: aiFormData.assessment.passSpeed || '',
              shootingAccuracy: aiFormData.assessment.shootingAccuracy || '',
              shootingPower: aiFormData.assessment.shootingPower || '',
              shootingDistance: aiFormData.assessment.shootingDistance || ''
            },
            match: {
              games: aiFormData.assessment.games || '',
              minutes: aiFormData.assessment.minutes || '',
              goals: aiFormData.assessment.goals || '',
              assists: aiFormData.assessment.assists || '',
              passes: aiFormData.assessment.passes || '',
              passRate: aiFormData.assessment.passRate || ''
            },
            // 主观评估数据
            subjective: {
              videoUrl: videoUrl,
              coachNotes: aiFormData.assessment.coachNotes || '',
              trainingDuration: aiFormData.assessment.trainingDuration || ''
            }
          };
          break;
        case 'training':
          endpoint = '/api/ai/training-plan';
          data = aiFormData.training;
          break;
        case 'match':
          endpoint = '/api/ai/match-analysis';
          data = aiFormData.match;
          break;
        case 'nutrition':
          endpoint = '/api/ai/nutrition-advice';
          data = aiFormData.nutrition;
          break;
        default:
          message.error('未知的分析类型');
          setAiLoading(false);
          return;
      }

      console.log(`发送${tab}请求:`, data);

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      console.log(`${tab}响应结果:`, result);
      
      if (result.success) {
        // 确保数据结构正确
        let processedResult = result;
        if (tab === 'training' && result.trainingPlan) {
          console.log('训练计划原始数据:', result.trainingPlan);
          console.log('intensity字段类型:', typeof result.trainingPlan.intensity);
          console.log('intensity字段内容:', result.trainingPlan.intensity);
          
          processedResult = {
            ...result,
            trainingPlan: {
              trainingGoals: Array.isArray(result.trainingPlan.trainingGoals) ? result.trainingPlan.trainingGoals : [],
              weeklySchedule: result.trainingPlan.weeklySchedule || {},
              focusAreas: Array.isArray(result.trainingPlan.focusAreas) ? result.trainingPlan.focusAreas : [],
              intensity: typeof result.trainingPlan.intensity === 'string' ? result.trainingPlan.intensity : '中等',
              specialAdvice: Array.isArray(result.trainingPlan.specialAdvice) ? result.trainingPlan.specialAdvice : [],
              notes: result.trainingPlan.notes || ''
            }
          };
          
          console.log('处理后的训练计划:', processedResult.trainingPlan);
          console.log('处理后intensity字段类型:', typeof processedResult.trainingPlan.intensity);
          console.log('处理后intensity字段内容:', processedResult.trainingPlan.intensity);
        }
        
        setAiResults(prev => ({ ...prev, [tab]: processedResult }));
        message.success(`${tab === 'assessment' ? '球员评估' : tab === 'training' ? '训练计划' : tab === 'match' ? '比赛分析' : '营养建议'}生成成功！`);
        // 清空视频文件
        if (videoFile) {
          setVideoFile(null);
        }
      } else {
        message.error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('AI功能错误:', error);
      message.error('网络错误，请重试');
    } finally {
      setAiLoading(false);
    }
  };

  // 球员评估页面
  const renderPlayerAssessment = () => {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '60px 20px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center' }}>球员评估</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, marginBottom: 40 }}>
          AI驱动的足球技能分析，基于客观测试数据和主观评估
        </Paragraph>
        
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Title level={4}>球员综合评估</Title>
          <Paragraph>选择评估方式，输入球员数据，获得专业的技能分析报告</Paragraph>
          
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="评估方式">
                <Radio.Group 
                  value={aiFormData.assessment.type || 'comprehensive'} 
                  onChange={(e) => handleAiFormChange('assessment', 'type', e.target.value)}
                >
                  <Radio value="comprehensive">综合评估（推荐）</Radio>
                  <Radio value="objective">客观数据评估</Radio>
                  <Radio value="subjective">视频数据评估</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {/* 基础信息 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>基础信息</Title>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Input 
                  placeholder="球员姓名" 
                  value={aiFormData.assessment.name || ''}
                  onChange={(e) => handleAiFormChange('assessment', 'name', e.target.value)}
                  size="large"
                />
              </Col>
              <Col span={8}>
                <Input 
                  placeholder="年龄" 
                  value={aiFormData.assessment.age || ''}
                  onChange={(e) => handleAiFormChange('assessment', 'age', e.target.value)}
                  size="large"
                />
              </Col>
              <Col span={8}>
                <Select 
                  placeholder="请选择司职" 
                  value={aiFormData.assessment.position || undefined}
                  onChange={(value) => handleAiFormChange('assessment', 'position', value)}
                  style={{ width: '100%' }}
                  size="large"
                  allowClear
                >
                  <Select.Option value="前锋">前锋</Select.Option>
                  <Select.Option value="中场">中场</Select.Option>
                  <Select.Option value="后卫">后卫</Select.Option>
                  <Select.Option value="门将">门将</Select.Option>
                </Select>
              </Col>
              <Col span={8}>
                <Input 
                  placeholder="身高(cm)" 
                  value={aiFormData.assessment.height || ''}
                  onChange={(e) => handleAiFormChange('assessment', 'height', e.target.value)}
                  size="large"
                />
              </Col>
              <Col span={8}>
                <Input 
                  placeholder="体重(kg)" 
                  value={aiFormData.assessment.weight || ''}
                  onChange={(e) => handleAiFormChange('assessment', 'weight', e.target.value)}
                  size="large"
                />
              </Col>
              <Col span={8}>
                <Input 
                  placeholder="训练年限" 
                  value={aiFormData.assessment.trainingYears || ''}
                  onChange={(e) => handleAiFormChange('assessment', 'trainingYears', e.target.value)}
                  size="large"
                />
              </Col>
            </Row>
          </div>

          {/* 客观测试数据 */}
          {(aiFormData.assessment.type === 'comprehensive' || aiFormData.assessment.type === 'objective') && (
            <>
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>体能测试数据</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Input 
                      placeholder="30米冲刺(秒)" 
                      value={aiFormData.assessment.sprint30m || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'sprint30m', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="50米冲刺(秒)" 
                      value={aiFormData.assessment.sprint50m || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'sprint50m', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="100米冲刺(秒)" 
                      value={aiFormData.assessment.sprint100m || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'sprint100m', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="12分钟跑(米)" 
                      value={aiFormData.assessment.run12min || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'run12min', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="YoYo测试(级数)" 
                      value={aiFormData.assessment.yoyoTest || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'yoyoTest', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="折返跑(秒)" 
                      value={aiFormData.assessment.shuttleRun || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'shuttleRun', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="立定跳远(厘米)" 
                      value={aiFormData.assessment.longJump || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'longJump', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="引体向上(个)" 
                      value={aiFormData.assessment.pullUps || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'pullUps', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="深蹲(公斤)" 
                      value={aiFormData.assessment.squat || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'squat', e.target.value)}
                    />
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: 24 }}>
                <Title level={5}>足球专项技能</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Input 
                      placeholder="颠球次数(个)" 
                      value={aiFormData.assessment.juggling || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'juggling', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="控球时间(秒)" 
                      value={aiFormData.assessment.ballControl || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'ballControl', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="变向控球(秒)" 
                      value={aiFormData.assessment.dribbling || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'dribbling', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="短传准确率(%)" 
                      value={aiFormData.assessment.shortPass || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'shortPass', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="长传准确率(%)" 
                      value={aiFormData.assessment.longPass || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'longPass', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="传球速度(秒)" 
                      value={aiFormData.assessment.passSpeed || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'passSpeed', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="射门准确率(%)" 
                      value={aiFormData.assessment.shootingAccuracy || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'shootingAccuracy', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="射门力量(km/h)" 
                      value={aiFormData.assessment.shootingPower || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'shootingPower', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="射门距离(米)" 
                      value={aiFormData.assessment.shootingDistance || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'shootingDistance', e.target.value)}
                    />
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: 24 }}>
                <Title level={5}>比赛表现数据</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Input 
                      placeholder="比赛场次" 
                      value={aiFormData.assessment.games || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'games', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="出场时间(分钟)" 
                      value={aiFormData.assessment.minutes || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'minutes', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="进球数" 
                      value={aiFormData.assessment.goals || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'goals', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="助攻数" 
                      value={aiFormData.assessment.assists || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'assists', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="传球次数" 
                      value={aiFormData.assessment.passes || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'passes', e.target.value)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input 
                      placeholder="传球成功率(%)" 
                      value={aiFormData.assessment.passRate || ''}
                      onChange={(e) => handleAiFormChange('assessment', 'passRate', e.target.value)}
                    />
                  </Col>
                </Row>
              </div>
            </>
          )}

          {/* 视频分析评估 */}
          {(aiFormData.assessment.type === 'comprehensive' || aiFormData.assessment.type === 'subjective') && (
            <div style={{ marginBottom: 24 }}>
              <Title level={5}>视频分析评估</Title>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>球员视频上传</div>
                    <Upload
                      beforeUpload={(file) => {
                        // 检查文件类型
                        const isVideo = file.type.startsWith('video/');
                        if (!isVideo) {
                          message.error('只能上传视频文件！');
                          return false;
                        }
                        // 检查文件大小 (限制为100MB)
                        const isLt100M = file.size / 1024 / 1024 < 100;
                        if (!isLt100M) {
                          message.error('视频文件大小不能超过100MB！');
                          return false;
                        }
                        
                        // 存储文件到状态中
                        setVideoFile(file);
                        return false; // 阻止自动上传
                      }}
                      accept="video/*"
                      maxCount={1}
                      showUploadList={videoFile ? [{ name: videoFile.name, status: 'done' }] : false}
                      onRemove={() => setVideoFile(null)}
                    >
                      <Button icon={<UploadOutlined />} size="large">
                        选择视频文件 (≤100MB)
                      </Button>
                    </Upload>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                      支持格式：MP4, AVI, MOV, WMV等常见视频格式
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <TextArea 
                    placeholder="教练评语(可选)" 
                    rows={4}
                    value={aiFormData.assessment.coachNotes || ''}
                    onChange={(e) => handleAiFormChange('assessment', 'coachNotes', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="训练时长(小时/周)" 
                    value={aiFormData.assessment.trainingDuration || ''}
                    onChange={(e) => handleAiFormChange('assessment', 'trainingDuration', e.target.value)}
                    size="large"
                  />
                </Col>
              </Row>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Button 
              type="primary" 
              size="large" 
              loading={aiLoading}
              onClick={() => handleAiSubmit('assessment')}
            >
              开始评估分析
            </Button>
          </div>

          {/* 评估结果展示 */}
          {aiResults.assessment && (
            <div style={{ marginTop: 40, padding: 24, background: '#f8f9fa', borderRadius: 8 }}>
              <Title level={4}>评估结果</Title>
              
              {/* 体能评估 */}
              <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: '#1890ff' }}>体能评估</Title>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {aiResults.assessment.analysis?.physical?.speed || 0}
                      </div>
                      <div>速度评分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {aiResults.assessment.analysis?.physical?.endurance || 0}
                      </div>
                      <div>耐力评分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                        {aiResults.assessment.analysis?.physical?.strength || 0}
                      </div>
                      <div>力量评分</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                        {aiResults.assessment.analysis?.physical?.overall || 0}
                      </div>
                      <div>体能综合</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 技术评估 */}
              <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: '#52c41a' }}>技术评估</Title>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {aiResults.assessment.analysis?.technical?.ballControl || 0}
                      </div>
                      <div>控球技术</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {aiResults.assessment.analysis?.technical?.passing || 0}
                      </div>
                      <div>传球技术</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                        {aiResults.assessment.analysis?.technical?.shooting || 0}
                      </div>
                      <div>射门技术</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                        {aiResults.assessment.analysis?.technical?.overall || 0}
                      </div>
                      <div>技术综合</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 比赛表现评估 */}
              <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: '#fa8c16' }}>比赛表现评估</Title>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {aiResults.assessment.analysis?.performance?.attack || 0}
                      </div>
                      <div>进攻能力</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {aiResults.assessment.analysis?.performance?.defense || 0}
                      </div>
                      <div>防守能力</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                        {aiResults.assessment.analysis?.performance?.teamwork || 0}
                      </div>
                      <div>团队配合</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                        {aiResults.assessment.analysis?.performance?.overall || 0}
                      </div>
                      <div>表现综合</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 整体评估 */}
              {aiResults.assessment.analysis?.overall && (
                <div style={{ marginBottom: 24 }}>
                  <Title level={5} style={{ color: '#722ed1' }}>整体评估</Title>
                  <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                      综合评分：{aiResults.assessment.analysis.overall.score || 0}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <b>优势：</b>
                      <ul>
                        {aiResults.assessment.analysis.overall.strengths?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <b>不足：</b>
                      <ul>
                        {aiResults.assessment.analysis.overall.weaknesses?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <b>改进建议：</b>
                      <ul>
                        {aiResults.assessment.analysis.overall.improvements?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  };

  // 智能互动页面
  const renderAiInteraction = () => {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '60px 20px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center' }}>AI成长助手</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: 16, marginBottom: 40 }}>
          AI驱动的训练计划制定、比赛表现评估和营养建议
        </Paragraph>
        
        <Tabs activeKey={aiActiveTab} onChange={setAiActiveTab} type="card">
          <Tabs.TabPane tab="训练计划" key="training">
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Title level={4}>个性化训练计划</Title>
              <Paragraph>根据球员特点和目标制定科学的训练计划</Paragraph>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Input 
                    placeholder="球员年龄" 
                    value={aiFormData.training.age || ''}
                    onChange={(e) => handleAiFormChange('training', 'age', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Select 
                    placeholder="当前水平" 
                    value={aiFormData.training.level || undefined}
                    onChange={(value) => handleAiFormChange('training', 'level', value)}
                    style={{ width: '100%' }}
                    size="large"
                    allowClear
                  >
                    <Select.Option value="初学者">初学者</Select.Option>
                    <Select.Option value="进阶">进阶</Select.Option>
                    <Select.Option value="高级">高级</Select.Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <div>
                    <Input 
                      placeholder="训练目标" 
                      value={aiFormData.training.goals || ''}
                      onChange={(e) => handleAiFormChange('training', 'goals', e.target.value)}
                      size="large"
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.4 }}>
                      💡 填写说明：如"提高射门精度"、"增强体能"、"改善传球技术"、"提升比赛意识"等具体目标
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="训练年限" 
                    value={aiFormData.training.trainingYears || ''}
                    onChange={(e) => handleAiFormChange('training', 'trainingYears', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <div>
                    <Select 
                      placeholder="请选择司职" 
                      value={aiFormData.training.specialGoals || undefined}
                      onChange={(value) => handleAiFormChange('training', 'specialGoals', value)}
                      style={{ width: '100%' }}
                      size="large"
                      allowClear
                    >
                      <Select.Option value="前锋">前锋</Select.Option>
                      <Select.Option value="中场">中场</Select.Option>
                      <Select.Option value="后卫">后卫</Select.Option>
                      <Select.Option value="门将">门将</Select.Option>
                    </Select>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.4 }}>
                      💡 选择球员的场上位置，AI将根据司职制定针对性训练计划
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="可用时间(小时/周)" 
                    value={aiFormData.training.availableTime || ''}
                    onChange={(e) => handleAiFormChange('training', 'availableTime', e.target.value)}
                    size="large"
                  />
                </Col>

              </Row>
              
              <Button type="primary" onClick={() => handleAiSubmit('training')} loading={aiLoading} style={{ marginTop: 16 }}>
                {aiLoading ? '生成中...' : '生成训练计划'}
              </Button>

              {aiResults.training && (
                <div style={{ marginTop: 32, background: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 24 }}>
                  <Title level={4} style={{ color: '#1890ff' }}>训练计划</Title>
                  <div><b>训练目标：</b>
                    <ul>
                      {Array.isArray(aiResults.training.trainingPlan?.trainingGoals) ? 
                        aiResults.training.trainingPlan.trainingGoals.map((item, i) => <li key={i}>{String(item)}</li>) :
                        <li>暂无训练目标</li>
                      }
                    </ul>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <b>每周安排：</b>
                    <ul>
                      {aiResults.training.trainingPlan?.weeklySchedule && 
                        Object.entries(aiResults.training.trainingPlan.weeklySchedule).map(([day, content]) => (
                          <li key={day}>
                            <b>{day === 'monday' ? '周一' : day === 'tuesday' ? '周二' : day === 'wednesday' ? '周三' : day === 'thursday' ? '周四' : day === 'friday' ? '周五' : day === 'saturday' ? '周六' : '周日'}：</b>
                            {String(content)}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                  <div>
                    <b>重点专项：</b>
                    {(() => {
                      const focusAreas = aiResults.training.trainingPlan?.focusAreas;
                      console.log('重点专项数据:', {
                        value: focusAreas,
                        type: typeof focusAreas,
                        isArray: Array.isArray(focusAreas),
                        length: Array.isArray(focusAreas) ? focusAreas.length : 'N/A'
                      });
                      
                      if (Array.isArray(focusAreas) && focusAreas.length > 0) {
                        return (
                          <ul>
                            {focusAreas.map((item, i) => <li key={i}>{String(item)}</li>)}
                          </ul>
                        );
                      } else if (typeof focusAreas === 'string' && focusAreas.trim()) {
                        return (
                          <ul>
                            <li>{focusAreas}</li>
                          </ul>
                        );
                      } else if (typeof focusAreas === 'object' && focusAreas !== null) {
                        return (
                          <ul>
                            <li>{JSON.stringify(focusAreas)}</li>
                          </ul>
                        );
                      } else {
                        return <ul><li>暂无重点专项</li></ul>;
                      }
                    })()}
                  </div>
                  <div><b>训练强度：</b> {(() => {
                    const intensity = aiResults.training.trainingPlan?.intensity;
                    console.log('渲染时intensity数据:', {
                      value: intensity,
                      type: typeof intensity,
                      isNull: intensity === null,
                      isUndefined: intensity === undefined,
                      stringified: JSON.stringify(intensity)
                    });
                    
                    if (typeof intensity === 'string') {
                      return intensity;
                    } else if (typeof intensity === 'object' && intensity !== null) {
                      return JSON.stringify(intensity);
                    } else {
                      return '未指定';
                    }
                  })()}</div>
                  <div style={{ marginTop: 12 }}>
                    <b>专项建议：</b>
                    <ul>
                      {(() => {
                        const specialAdvice = aiResults.training.trainingPlan?.specialAdvice;
                        console.log('专项建议数据:', {
                          value: specialAdvice,
                          type: typeof specialAdvice,
                          isArray: Array.isArray(specialAdvice)
                        });
                        
                        if (Array.isArray(specialAdvice) && specialAdvice.length > 0) {
                          return specialAdvice.map((item, i) => {
                            // 如果是对象，尝试提取有用的信息
                            if (typeof item === 'object' && item !== null) {
                              if (item.message) {
                                return <li key={i}>{item.message}</li>;
                              } else if (item.title) {
                                return <li key={i}>{item.title}</li>;
                              } else {
                                return <li key={i}>{JSON.stringify(item)}</li>;
                              }
                            } else {
                              return <li key={i}>{String(item)}</li>;
                            }
                          });
                        } else if (typeof specialAdvice === 'string' && specialAdvice.trim()) {
                          return <li>{specialAdvice}</li>;
                        } else if (typeof specialAdvice === 'object' && specialAdvice !== null) {
                          // 如果是单个对象
                          if (specialAdvice.message) {
                            return <li>{specialAdvice.message}</li>;
                          } else if (specialAdvice.title) {
                            return <li>{specialAdvice.title}</li>;
                          } else {
                            return <li>{JSON.stringify(specialAdvice)}</li>;
                          }
                        } else {
                          return <li>暂无专项建议</li>;
                        }
                      })()}
                    </ul>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <b>注意事项：</b>
                    {(() => {
                      const notes = aiResults.training.trainingPlan?.notes;
                      console.log('注意事项数据:', {
                        value: notes,
                        type: typeof notes,
                        isArray: Array.isArray(notes),
                        length: Array.isArray(notes) ? notes.length : 'N/A',
                        isNull: notes === null,
                        isUndefined: notes === undefined,
                        isEmpty: notes === '',
                        isWhitespace: typeof notes === 'string' && notes.trim() === ''
                      });
                      
                      if (Array.isArray(notes) && notes.length > 0) {
                        return (
                          <ul>
                            {notes.map((item, i) => <li key={i}>{String(item)}</li>)}
                          </ul>
                        );
                      } else if (typeof notes === 'string' && notes.trim()) {
                        // 清理字符串，移除开头和结尾的分号
                        const cleanedNotes = notes.replace(/^[；;]+/, '').replace(/[；;]+$/, '');
                        return <p>{cleanedNotes}</p>;
                      } else if (typeof notes === 'object' && notes !== null) {
                        return <p>{JSON.stringify(notes)}</p>;
                      } else {
                        return <p>暂无注意事项</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="营养建议" key="nutrition">
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Title level={4}>运动营养建议</Title>
              <Paragraph>根据训练强度和球员情况提供个性化营养方案</Paragraph>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Input 
                    placeholder="球员年龄" 
                    value={aiFormData.nutrition.age || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'age', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="体重(kg)" 
                    value={aiFormData.nutrition.weight || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'weight', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="身高(cm)" 
                    value={aiFormData.nutrition.height || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'height', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Select 
                    placeholder="训练强度" 
                    value={aiFormData.nutrition.intensity || undefined}
                    onChange={(value) => handleAiFormChange('nutrition', 'intensity', value)}
                    style={{ width: '100%' }}
                    size="large"
                    allowClear
                  >
                    <Select.Option value="低强度">低强度</Select.Option>
                    <Select.Option value="中等强度">中等强度</Select.Option>
                    <Select.Option value="高强度">高强度</Select.Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Input 
                    placeholder="训练时长(小时/周)" 
                    value={aiFormData.nutrition.duration || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'duration', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={8}>
                  <Select 
                    placeholder="性别" 
                    value={aiFormData.nutrition.gender || undefined}
                    onChange={(value) => handleAiFormChange('nutrition', 'gender', value)}
                    style={{ width: '100%' }}
                    size="large"
                    allowClear
                  >
                    <Select.Option value="男">男</Select.Option>
                    <Select.Option value="女">女</Select.Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Input 
                    placeholder="饮食禁忌（如过敏食物，逗号分隔）" 
                    value={aiFormData.nutrition.dietTaboo || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'dietTaboo', e.target.value)}
                    size="large"
                  />
                </Col>
                <Col span={12}>
                  <Input 
                    placeholder="特殊需求（如素食、宗教要求等）" 
                    value={aiFormData.nutrition.specialNeeds || ''}
                    onChange={(e) => handleAiFormChange('nutrition', 'specialNeeds', e.target.value)}
                    size="large"
                  />
                </Col>
              </Row>
              
              <Button type="primary" onClick={() => {
                // 更健壮的必填项校验
                const { age, weight, height, intensity, duration, gender } = aiFormData.nutrition || {};
                const isEmpty = v => v === undefined || v === null || String(v).trim() === '';
                if ([age, weight, height, intensity, duration, gender].some(isEmpty)) {
                  message.error('请完整填写年龄、体重、身高、训练强度、训练时长、性别等所有必填项！');
                  return;
                }
                handleAiSubmit('nutrition');
              }} loading={aiLoading} style={{ marginTop: 16 }}>
                {aiLoading ? '生成中...' : '生成营养建议'}
              </Button>

              {aiResults.nutrition && (
                <div style={{ marginTop: 32, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 24 }}>
                  <Title level={4} style={{ color: '#52c41a' }}>营养建议</Title>
                  <div><b>每日热量需求：</b> {String(aiResults.nutrition.nutritionAdvice?.dailyCalories || '未指定')} 卡路里</div>
                  <div style={{ marginTop: 12 }}>
                    <b>营养素配比：</b>
                    <ul>
                      <li>蛋白质：{String(aiResults.nutrition.nutritionAdvice?.macronutrients?.protein || '未指定')}</li>
                      <li>碳水化合物：{String(aiResults.nutrition.nutritionAdvice?.macronutrients?.carbs || '未指定')}</li>
                      <li>脂肪：{String(aiResults.nutrition.nutritionAdvice?.macronutrients?.fats || '未指定')}</li>
                    </ul>
                  </div>
                  <div>
                    <b>训练前饮食：</b>
                    <p>{aiResults.nutrition.nutritionAdvice?.preTraining && aiResults.nutrition.nutritionAdvice.preTraining.length > 8 && !/建议|无|未指定/.test(aiResults.nutrition.nutritionAdvice.preTraining) ? String(aiResults.nutrition.nutritionAdvice.preTraining) : '暂无具体建议'}</p>
                  </div>
                  <div>
                    <b>训练后饮食：</b>
                    <p>{aiResults.nutrition.nutritionAdvice?.postTraining && aiResults.nutrition.nutritionAdvice.postTraining.length > 8 && !/建议|无|未指定/.test(aiResults.nutrition.nutritionAdvice.postTraining) ? String(aiResults.nutrition.nutritionAdvice.postTraining) : '暂无具体建议'}</p>
                  </div>
                  <div>
                    <b>补充剂建议：</b>
                    <ul>
                      {Array.isArray(aiResults.nutrition.nutritionAdvice?.supplements) && aiResults.nutrition.nutritionAdvice.supplements.length && aiResults.nutrition.nutritionAdvice.supplements.some(s => s && s.length > 2 && !/建议|无|未指定/.test(s)) ?
                        aiResults.nutrition.nutritionAdvice.supplements.map((item, i) => <li key={i}>{String(item)}</li>) :
                        <li>暂无具体建议</li>
                      }
                    </ul>
                  </div>
                  <div>
                    <b>饮食禁忌建议：</b>
                    <p>{aiResults.nutrition.nutritionAdvice?.dietTabooAdvice && aiResults.nutrition.nutritionAdvice.dietTabooAdvice.length > 2 && !/建议|无|未指定/.test(aiResults.nutrition.nutritionAdvice.dietTabooAdvice) ? aiResults.nutrition.nutritionAdvice.dietTabooAdvice : '暂无具体建议'}</p>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <b>每日食谱建议：</b>
                    <ul>
                      {Array.isArray(aiResults.nutrition.nutritionAdvice?.sampleMenu) && aiResults.nutrition.nutritionAdvice.sampleMenu.length && aiResults.nutrition.nutritionAdvice.sampleMenu.some(item => item && item.length > 8) ?
                        aiResults.nutrition.nutritionAdvice.sampleMenu.map((item, i) => <li key={i}>{String(item)}</li>) :
                        <li>暂无具体建议</li>
                      }
                    </ul>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <b>注意事项：</b>
                    <p>{String(aiResults.nutrition.nutritionAdvice?.notes || '无')}</p>
                  </div>
                </div>
              )}
            </div>
          </Tabs.TabPane>
        </Tabs>
        </div>
      </div>
    );
  };

  // 家长社区页面
  const renderTopicDetail = () => (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <Button 
          type="link" 
          onClick={() => setPage('parent-community')}
          style={{ padding: 0, fontSize: 16 }}
        >
          ← 返回社区
        </Button>
      </div>
      
      {loadingTopicDetail ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div>加载中...</div>
        </div>
      ) : currentTopic ? (
        <div style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {/* 话题标题和基本信息 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ marginBottom: 16 }}>
              {currentTopic.title}
            </Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ color: '#666', fontSize: 14 }}>
                发布者：{currentTopic.author}（{currentTopic.authorRole}） • {new Date(currentTopic.createdAt).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button 
                  type="text" 
                  icon={<span>👍</span>}
                  onClick={() => handleLike(currentTopic.id)}
                  style={{ color: '#666' }}
                >
                  {currentTopic.likes}
                </Button>
                <span style={{ color: '#666', fontSize: 14 }}>👁 {currentTopic.views}</span>
              </div>
            </div>
            {currentTopic.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {currentTopic.tags.map((tag, index) => (
                  <span 
                    key={index}
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      marginRight: 8,
                      background: '#f0f0f0',
                      borderRadius: 16,
                      fontSize: 12,
                      color: '#666'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* 话题内容 */}
          <div style={{ 
            padding: '20px 0', 
            borderTop: '1px solid #f0f0f0', 
            borderBottom: '1px solid #f0f0f0',
            marginBottom: 24
          }}>
            <div style={{ fontSize: 16, lineHeight: 1.8, color: '#333' }}>
              {currentTopic.content}
            </div>
          </div>
          
          {/* 回复列表 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              回复 ({currentTopic.replies.length})
            </Title>
            
            {currentTopic.replies.length > 0 ? (
              <div>
                {currentTopic.replies.map((reply, index) => (
                  <div 
                    key={reply.id} 
                    style={{ 
                      padding: '16px 0', 
                      borderBottom: index < currentTopic.replies.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                  >
                    <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                      {reply.content}
                    </div>
                    <div style={{ color: '#666', fontSize: 14 }}>
                      {reply.author}（{reply.authorRole}） • {new Date(reply.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#666' }}>
                暂无回复，快来发表第一个回复吧！
              </div>
            )}
          </div>
          
          {/* 回复表单 */}
          {user ? (
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                发表回复
              </Title>
              <Form
                form={replyForm}
                onFinish={handleReply}
              >
                <Form.Item 
                  name="content" 
                  rules={[
                    { required: true, message: '请输入回复内容' },
                    { min: 5, message: '回复内容至少5个字符' }
                  ]}
                >
                  <TextArea 
                    placeholder="请输入您的回复..."
                    rows={4}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={submittingReply}
                  >
                    发表回复
                  </Button>
                </Form.Item>
              </Form>
            </div>
          ) : (
            <div style={{ 
              borderTop: '1px solid #f0f0f0', 
              paddingTop: 24, 
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ marginBottom: 16 }}>登录后才能发表回复</div>
              <Button type="primary" onClick={() => setModal('login')}>
                立即登录
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
          话题不存在或已被删除
        </div>
      )}
    </div>
  );

  const renderNewTopic = () => (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <Button 
          type="link" 
          onClick={() => { setPresetTag(''); setPage('parent-community'); }}
          style={{ padding: 0, fontSize: 16 }}
        >
          ← 返回社区
        </Button>
      </div>
      
      <div style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ marginBottom: 32, textAlign: 'center' }}>
          发布新话题
        </Title>
        
        {/* 本周话题提示 */}
        {presetTag === '训练日常' && (
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: 8,
            color: '#fff'
          }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>🎯 本周话题：晒晒孩子的训练日常</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              上传孩子训练的照片或视频，分享训练心得，赢取社区徽章！
            </div>
          </div>
        )}
        
        <Form
          form={newTopicForm}
          layout="vertical"
          onFinish={handlePublishTopic}
          initialValues={{ tags: presetTag }}
        >
          <Form.Item 
            label="话题标题" 
            name="title" 
            rules={[
              { required: true, message: '请输入话题标题' },
              { min: 5, message: '标题至少5个字符' },
              { max: 100, message: '标题不能超过100个字符' }
            ]}
          >
            <Input 
              placeholder={presetTag === '训练日常' ? "例如：今天孩子的训练成果分享" : "请输入话题标题，例如：如何帮助孩子提高足球技术？"}
              size="large"
            />
          </Form.Item>
          
          {/* 本周话题上传区域 */}
          {presetTag === '训练日常' && (
            <Form.Item label="训练照片/视频">
              <Upload
                beforeUpload={file => {
                  if (file.type.startsWith('image/')) {
                    setPhotoFile(file);
                  } else if (file.type.startsWith('video/')) {
                    setVideoFile(file);
                  }
                  return false;
                }}
                showUploadList={true}
                accept="image/*,video/*"
                maxCount={3}
              >
                <Button icon={<UploadOutlined />}>上传训练照片或视频</Button>
              </Upload>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                支持上传训练照片或视频，最多3个文件
              </div>
            </Form.Item>
          )}
          
          <Form.Item 
            label="话题内容" 
            name="content" 
            rules={[
              { required: true, message: '请输入话题内容' },
              { min: 20, message: '内容至少20个字符' }
            ]}
          >
            <TextArea 
              placeholder={presetTag === '训练日常' ? "分享孩子的训练过程、进步情况、训练心得等..." : "请详细描述您的问题或分享的内容，可以包含具体的情况、遇到的问题、希望得到的帮助等..."}
              rows={8}
              showCount
              maxLength={2000}
            />
          </Form.Item>
          
          <Form.Item 
            label="标签" 
            name="tags"
            extra="请输入相关标签，用逗号分隔，例如：技术训练, 伤病处理, 心理辅导"
          >
            <Input 
              placeholder="技术训练, 伤病处理, 心理辅导"
              size="large"
              value={presetTag || undefined}
              onChange={e => {
                newTopicForm.setFieldsValue({ tags: e.target.value });
                setPresetTag(e.target.value);
              }}
            />
          </Form.Item>
          
          <Form.Item style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large"
              loading={publishingTopic}
              block
              style={{ height: 48, fontSize: 16 }}
            >
              {presetTag === '训练日常' ? '发布本周话题' : '发布话题'}
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 6 }}>
          <Title level={5} style={{ marginBottom: 12 }}>发布提示</Title>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
            <li>请确保话题内容真实、有价值，避免重复发布相似内容</li>
            <li>话题标题要简洁明了，内容要详细具体</li>
            <li>添加相关标签有助于其他用户快速找到您的话题</li>
            <li>发布后可以邀请其他用户参与讨论</li>
            {presetTag === '训练日常' && (
              <li>本周话题参与者有机会获得社区徽章奖励</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderParentCommunity = () => (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '60px 20px 80px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
      <Title level={2} style={{ textAlign: 'center' }}>家长社区</Title>
      <Paragraph style={{ textAlign: 'center', fontSize: 16, marginBottom: 40 }}>
        连接足球家长，分享经验，共同成长
      </Paragraph>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>热门讨论</Title>
              <div>
                <Button size="small" type={tagFilter==='all' ? 'primary' : 'default'} style={{ marginRight: 8 }} onClick={()=>setTagFilter('all')}>全部</Button>
                <Button size="small" type={tagFilter==='训练日常' ? 'primary' : 'default'} style={{ marginRight: 8 }} onClick={()=>setTagFilter('训练日常')}>只看本周话题</Button>
                <Button size="small" type={tagFilter==='颠球挑战' ? 'primary' : 'default'} onClick={()=>setTagFilter('颠球挑战')}>只看挑战赛</Button>
              </div>
              {user ? (
                <Button 
                  type="primary" 
                  onClick={() => { setPresetTag(''); setPage('new-topic'); }}
                  icon={<UploadOutlined />}
                >
                  发布新话题
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={() => setModal('login')}
                  icon={<LoginOutlined />}
                >
                  登录后发布
                </Button>
              )}
            </div>
            {/* 话题列表筛选 */}
            {loadingTopics ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div>加载中...</div>
              </div>
            ) : (topics.filter(topic => tagFilter==='all' || (topic.tags && topic.tags.includes(tagFilter))).length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                {topics.filter(topic => tagFilter==='all' || (topic.tags && topic.tags.includes(tagFilter))).map((topic, index) => (
                  <div 
                    key={topic.id} 
                    style={{ 
                      padding: '16px 0', 
                      borderBottom: index < topics.length - 1 ? '1px solid #f0f0f0' : 'none',
                      cursor: 'pointer'
                    }}
                                         onClick={() => {
                       fetchTopicDetail(topic.id);
                       setPage('topic-detail');
                     }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 16 }}>
                      {topic.title}
                    </div>
                    <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                      {topic.content.length > 100 ? topic.content.substring(0, 100) + '...' : topic.content}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#666', fontSize: 14 }}>
                        分享者：{topic.author}（{topic.authorRole}） • {new Date(topic.createdAt).toLocaleString()} • {topic.replies.length}回复
                      </div>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                         <Button 
                           type="text" 
                           size="small"
                           icon={<span>👍</span>}
                           onClick={(e) => {
                             e.stopPropagation();
                             handleLike(topic.id);
                           }}
                           style={{ color: '#666', padding: '0 8px' }}
                         >
                           {topic.likes}
                         </Button>
                         <span style={{ color: '#666', fontSize: 12 }}>👁 {topic.views}</span>
                       </div>
                    </div>
                    {topic.tags.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {topic.tags.map((tag, tagIndex) => (
                          <span 
                            key={tagIndex}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              marginRight: 8,
                              background: '#f0f0f0',
                              borderRadius: 12,
                              fontSize: 12,
                              color: '#666'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
                <div style={{ marginBottom: 16 }}>暂无话题</div>
                {user && (
                  <Button type="primary" onClick={() => { setPresetTag(''); setPage('new-topic'); }}>
                    发布第一个话题
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 24 }}>
            <Title level={4}>家长互动</Title>
            <div style={{ marginBottom: 16 }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>本周话题：晒晒孩子的训练日常</div>
                <div style={{ color: '#666', fontSize: 12 }}>参与话题，赢取社区徽章</div>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>连续颠球挑战赛</div>
                <div style={{ color: '#666', fontSize: 12 }}>上传视频，展示孩子进步</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>家长投票：最关心哪方面？</div>
                <div style={{ color: '#666', fontSize: 12 }}>技术训练 vs 体能发展</div>
              </div>
            </div>
            <Button type="primary" style={{ marginRight: 8 }} onClick={() => { setPresetTag('训练日常'); setPage('new-topic'); }}>参与本周话题</Button>
            <Button type="primary" onClick={() => setPage('challenge')}>参与挑战</Button>
          </div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 12 }}>家长投票</Title>
              <div style={{ marginBottom: 16, fontSize: 15 }}>你更关心孩子哪方面？</div>
                {voteState ? (
              <div>
              <div style={{ marginBottom: 8, fontWeight: voteState==='tech' ? 600 : 400 }}>
                技术训练
              <div style={{ background: '#e6f7ff', borderRadius: 8, height: 18, margin: '6px 0', position: 'relative' }}>
              <div style={{ width: `${Math.round(voteResult.tech/(voteResult.tech+voteResult.body)*100)}%`, background: '#1890ff', height: '100%', borderRadius: 8 }}></div>
                <span style={{ position: 'absolute', left: 8, top: 0, fontSize: 13, color: '#222' }}>{Math.round(voteResult.tech/(voteResult.tech+voteResult.body)*100)}%</span>
              </div>
              </div>
          <div style={{ marginBottom: 8, fontWeight: voteState==='body' ? 600 : 400 }}>
            体能发展
          <div style={{ background: '#fffbe6', borderRadius: 8, height: 18, margin: '6px 0', position: 'relative' }}>
          <div style={{ width: `${Math.round(voteResult.body/(voteResult.tech+voteResult.body)*100)}%`, background: '#faad14', height: '100%', borderRadius: 8 }}></div>
          <span style={{ position: 'absolute', left: 8, top: 0, fontSize: 13, color: '#222' }}>{Math.round(voteResult.body/(voteResult.tech+voteResult.body)*100)}%</span>
          </div>
          </div>
          <div style={{ color: '#888', fontSize: 13 }}>感谢您的参与！</div>
          </div>
        ) : (
      <div style={{ display: 'flex', gap: 16 }}>
        <Button
          type="primary"
          ghost={voteState !== 'tech'}
          loading={voteLoading}
          onClick={() => handleVote('tech')}
          style={{ minWidth: 100 }}
        >
          技术训练
        </Button>
        <Button
          type="primary"
          ghost={voteState !== 'body'}
          loading={voteLoading}
          onClick={() => handleVote('body')}
          style={{ minWidth: 100 }}
        >
          体能发展
        </Button>
      </div>
      )}
      </div>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Title level={4}>AI智能答疑</Title>
            <Paragraph style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              有问题？AI助手为您解答足球训练、健康、心理等问题
            </Paragraph>
            {user ? (
              <Form form={aiQuestionForm} onFinish={handleAskAI}>
                <Form.Item name="question" rules={[{ required: true, message: '请输入您的问题' }]}>
                  <Input.TextArea 
                    placeholder="例如：孩子踢球时总是紧张怎么办？"
                    rows={3}
                    maxLength={200}
                  />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={askingAI}
                    block
                  >
                    询问AI助手
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <Button type="primary" onClick={() => setModal('login')} block>
                登录后提问
              </Button>
            )}
            {aiAnswer && (
              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                background: '#f8f9fa', 
                borderRadius: 6,
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontWeight: 500, marginBottom: 8, color: '#1890ff' }}>AI助手回答：</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333' }}>
                  {aiAnswer}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Title level={4}>知识库</Title>
            <div style={{ marginBottom: 16 }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>青少年足球饮食指南</div>
                <div style={{ color: '#666', fontSize: 12 }}>营养搭配建议</div>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>足球训练心理调适</div>
                <div style={{ color: '#666', fontSize: 12 }}>如何保持孩子兴趣</div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>常见伤病预防</div>
                <div style={{ color: '#666', fontSize: 12 }}>安全训练要点</div>
              </div>
            </div>
            <Button onClick={() => setPage('ai-interaction')}>查看更多</Button>
          </div>
        </Col>
      </Row>
      
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Button onClick={() => { setPresetTag(''); setPage('home'); }}>返回首页</Button>
      </div>
      </div>
    </div>
  );

  // 主页内容
  const renderHome = () => (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '60px 20px 80px 20px'
    }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: 80 }}>
        <Row justify="center" align="middle" style={{ marginBottom: 40 }}>
          <Col>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 70,
                height: 70,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Image 
                  src={logoUrl} 
                  width={50} 
                  preview={false} 
                  style={{ 
                    verticalAlign: 'middle'
                  }} 
                />
              </div>
            </div>
          </Col>
          <Col>
            <Title 
              level={1} 
              style={{ 
                display: 'inline-block', 
                verticalAlign: 'middle', 
                fontWeight: 800, 
                fontSize: 64,
                color: '#fff',
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              华夏小将
            </Title>
          </Col>
        </Row>
        
        <div style={{ marginBottom: 60 }}>
          <Paragraph style={{ 
            fontSize: 24, 
            fontWeight: 400,
            color: '#fff',
            marginBottom: 16,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            点燃梦想，成就未来球星！
          </Paragraph>
          <Paragraph style={{ 
            fontSize: 20, 
            fontWeight: 300,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 0,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            让每个孩子都能在绿茵场上闪光
          </Paragraph>
        </div>

        {/* CTA Buttons */}
        <div style={{ marginBottom: 80 }}>
          <Button 
            type="primary" 
            size="large"
            style={{
              height: 56,
              fontSize: 18,
              fontWeight: 600,
              padding: '0 40px',
              marginRight: 20,
              background: '#fff',
              color: '#667eea',
              border: 'none',
              borderRadius: 28,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
            onClick={() => setModal('player')}
          >
            立即注册
          </Button>
          <Button 
            size="large"
            style={{
              height: 56,
              fontSize: 18,
              fontWeight: 600,
              padding: '0 40px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 28,
              backdropFilter: 'blur(10px)'
            }}
            onClick={() => setModal('login')}
          >
            登录体验
          </Button>
        </div>
      </div>

      {/* Image Gallery */}
      <div style={{ marginBottom: 80 }}>
        <Row gutter={[24, 24]} justify="center">
          {playerPhotos.slice(0, 4).map((url, idx) => (
            <Col key={idx} xs={12} sm={6}>
              <div style={{
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                transform: 'translateY(0)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
              }}
              >
                <Image 
                  src={url} 
                  width="100%" 
                  height={200} 
                  style={{ 
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                  preview={false} 
                />
              </div>
            </Col>
          ))}
        </Row>
        <Row gutter={[24, 24]} justify="center" style={{ marginTop: 24 }}>
          {playerPhotos.slice(4, 8).map((url, idx) => (
            <Col key={idx} xs={12} sm={6}>
              <div style={{
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                transform: 'translateY(0)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.15)';
              }}
              >
                <Image 
                  src={url} 
                  width="100%" 
                  height={200} 
                  style={{ 
                    objectFit: 'cover',
                    display: 'block'
                  }} 
                  preview={false} 
                />
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Features Section - Raphael AI Style */}
      <div style={{ 
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 32,
        padding: '80px 40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Title level={2} style={{ 
            fontSize: 48, 
            fontWeight: 700, 
            color: '#1a1a1a',
            marginBottom: 16
          }}>
            平台核心功能
          </Title>
          <Paragraph style={{ 
            fontSize: 20, 
            color: '#666',
            maxWidth: 600,
            margin: '0 auto'
          }}>
            专为青少年足球人才打造的综合性平台，提供全方位的成长支持
          </Paragraph>
        </div>

        <Row gutter={[40, 40]} justify="center">
          <Col xs={24} sm={12} lg={8}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 24,
              padding: 48,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(102, 126, 234, 0.2)',
              minHeight: 320,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }} />
              <RobotOutlined style={{ 
                fontSize: 64, 
                color: '#fff', 
                marginBottom: 24,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }} />
              <div style={{ 
                fontWeight: 700, 
                fontSize: 24, 
                marginBottom: 16,
                color: '#fff'
              }}>
                AI智能成长助手
              </div>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 16,
                lineHeight: 1.6
              }}>
                个性化训练计划、技能评估与营养建议，基于AI技术为每位小将提供科学的成长指导
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: 24,
              padding: 48,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(240, 147, 251, 0.2)',
              minHeight: 320,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }} />
              <TeamOutlined style={{ 
                fontSize: 64, 
                color: '#fff', 
                marginBottom: 24,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }} />
              <div style={{ 
                fontWeight: 700, 
                fontSize: 24, 
                marginBottom: 16,
                color: '#fff'
              }}>
                家长社区互动
              </div>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 16,
                lineHeight: 1.6
              }}>
                经验交流、活动分享、专家问答，陪伴孩子成长每一步，构建温暖的足球家庭社区
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: 24,
              padding: 48,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(79, 172, 254, 0.2)',
              minHeight: 320,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }} />
              <UserOutlined style={{ 
                fontSize: 64, 
                color: '#fff', 
                marginBottom: 24,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }} />
              <div style={{ 
                fontWeight: 700, 
                fontSize: 24, 
                marginBottom: 16,
                color: '#fff'
              }}>
                快速注册体验
              </div>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 16,
                lineHeight: 1.6
              }}>
                简单便捷的注册流程，3分钟完成球员或教练注册，立即开始您的足球之旅
              </div>
            </div>
          </Col>
        </Row>

        {/* Additional Features */}
        <Row gutter={[40, 40]} justify="center" style={{ marginTop: 40 }}>
          <Col xs={24} sm={12} lg={6}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
            }}
            >
              <TrophyOutlined style={{ 
                fontSize: 48, 
                color: '#667eea', 
                marginBottom: 16
              }} />
              <div style={{ 
                fontWeight: 600, 
                fontSize: 18, 
                marginBottom: 8,
                color: '#1a1a1a'
              }}>
                专业评估
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: 14
              }}>
                全面的技能评估体系
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
            }}
            >
              <CommunityOutlined style={{ 
                fontSize: 48, 
                color: '#f093fb', 
                marginBottom: 16
              }} />
              <div style={{ 
                fontWeight: 600, 
                fontSize: 18, 
                marginBottom: 8,
                color: '#1a1a1a'
              }}>
                社区交流
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: 14
              }}>
                家长经验分享平台
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
            }}
            >
              <TeamOutlined style={{ 
                fontSize: 48, 
                color: '#4facfe', 
                marginBottom: 16
              }} />
              <div style={{ 
                fontWeight: 600, 
                fontSize: 18, 
                marginBottom: 8,
                color: '#1a1a1a'
              }}>
                教练入驻
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: 14
              }}>
                专业教练资源对接
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} lg={6}>
            <div style={{
              background: '#fff',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
            }}
            >
              <UploadOutlined style={{ 
                fontSize: 48, 
                color: '#00f2fe', 
                marginBottom: 16
              }} />
              <div style={{ 
                fontWeight: 600, 
                fontSize: 18, 
                marginBottom: 8,
                color: '#1a1a1a'
              }}>
                内容上传
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: 14
              }}>
                照片视频记录成长
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

  // 占位弹窗内容
  const renderModalContent = () => {
    if (modal === 'player') return renderPlayerForm();
    if (modal === 'coach') return renderCoachForm();
    if (modal === 'login') return renderLoginForm();
    return null;
  };

  const renderChallenge = () => {
    // 只筛选带"颠球挑战"标签的话题
    const challengeTopics = topics.filter(topic => topic.tags && topic.tags.includes('颠球挑战'));

    // 上传并发帖
    const handleChallengeUpload = async () => {
      if (!user) {
        message.error('请先登录');
        return;
      }
      if (!challengeVideo) {
        message.error('请上传挑战视频');
        return;
      }
      setChallengeUploading(true);
      try {
        // 上传视频
        const formData = new FormData();
        formData.append('video', challengeVideo);
        const uploadRes = await axios.post('http://localhost:3001/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // 发帖
        const topicData = {
          title: `${user.name}的颠球挑战`,
          content: challengeDesc || '我来参加颠球挑战啦！',
          author: user.name,
          authorRole: user.role === 'player' ? '小将' : '教练',
          tags: ['颠球挑战'],
          video: uploadRes.data.video || uploadRes.data.filename
        };
        await axios.post('http://localhost:3001/api/topics', topicData);
        message.success('挑战视频上传并发布成功！');
        setChallengeVideo(null);
        setChallengeDesc('');
        fetchTopics();
      } catch (err) {
        message.error('上传或发布失败');
      }
      setChallengeUploading(false);
    };

    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <Button type="link" onClick={() => setPage('parent-community')} style={{ padding: 0, fontSize: 16 }}>← 返回社区</Button>
        </div>
        <div style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Title level={2} style={{ marginBottom: 24 }}>颠球挑战赛</Title>
          <Paragraph style={{ marginBottom: 16 }}>
            <b>挑战规则：</b>上传一段孩子连续颠球的视频，展示颠球次数和技巧。视频内容真实有效，鼓励家长和孩子共同参与。
          </Paragraph>
          <div style={{ marginBottom: 24 }}>
            <Upload
              beforeUpload={file => { setChallengeVideo(file); return false; }}
              showUploadList={challengeVideo ? [{ name: challengeVideo.name }] : false}
              accept="video/*"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>上传挑战视频</Button>
            </Upload>
            <Input.TextArea
              style={{ marginTop: 12 }}
              rows={2}
              maxLength={100}
              placeholder="可选：简单描述本次挑战或颠球成绩..."
              value={challengeDesc}
              onChange={e => setChallengeDesc(e.target.value)}
            />
            <Button
              type="primary"
              style={{ marginTop: 12 }}
              loading={challengeUploading}
              onClick={handleChallengeUpload}
              block
            >
              发布挑战
            </Button>
          </div>
          <Title level={4} style={{ margin: '32px 0 16px 0' }}>挑战榜单</Title>
          {challengeTopics.length > 0 ? (
            <div>
              {challengeTopics.map((topic, idx) => (
                <div key={topic.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 0' }}>
                  <div style={{ fontWeight: 500, fontSize: 16 }}>{topic.title}</div>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                    {topic.author}（{topic.authorRole}） • {new Date(topic.createdAt).toLocaleString()}
                  </div>
                  {topic.video && (
                    <video src={typeof topic.video === 'string' ? `/uploads/${topic.video}` : ''} controls style={{ width: 240, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
                  )}
                  <div style={{ color: '#888', fontSize: 13 }}>点赞数：{topic.likes || 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>暂无挑战视频，快来参与吧！</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Header style={{ background: '#fff', boxShadow: '0 2px 8px #f0f1f2', padding: 0 }}>
        <Row align="middle" justify="space-between" style={{ width: '100%' }}>
          <Col flex="auto">
            <Row align="middle" style={{ height: 64 }}>
              <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 28 }}>
                <Image src={logoUrl} width={40} preview={false} style={{ marginLeft: 24, verticalAlign: 'middle' }} />
                <span style={{ fontWeight: 700, fontSize: 22, color: '#222', lineHeight: '40px', verticalAlign: 'middle' }}>华夏小将</span>
              </div>
              <Menu mode="horizontal" selectable={false} style={{ borderBottom: 'none', marginLeft: 32, flex: 1, minWidth: 0 }}>
                <Menu.Item key="player" icon={<UserOutlined />} onClick={() => setModal('player')}>小将注册</Menu.Item>
                <Menu.Item key="coach" icon={<TeamOutlined />} onClick={() => setModal('coach')}>教练入驻</Menu.Item>
                <Menu.Item key="ai-interaction" icon={<RobotOutlined />} onClick={() => setPage('ai-interaction')}>AI成长助手</Menu.Item>
                <Menu.Item key="player-assessment" icon={<TrophyOutlined />} onClick={() => setPage('player-assessment')}>球员评估</Menu.Item>
                <Menu.Item key="parent-community" icon={<CommunityOutlined />} onClick={() => setPage('parent-community')}>家长社区</Menu.Item>
              </Menu>
            </Row>
          </Col>
          <Col flex="none">
            {user ? (
              <Button onClick={() => { setUser(null); setPage('home'); }}>退出登录</Button>
            ) : (
              <Button type="primary" icon={<LoginOutlined />} style={{ marginRight: 32 }} onClick={() => setModal('login')}>
                登录
              </Button>
            )}
          </Col>
        </Row>
      </Header>
      <Content style={{ minHeight: 'calc(100vh - 64px)', background: '#fff' }}>
        {page === 'home' && renderHome()}
        {page === 'player-upload' && renderPlayerUpload()}
        {page === 'coach-view' && renderCoachView()}
        {page === 'ai-interaction' && renderAiInteraction()}
        {page === 'player-assessment' && renderPlayerAssessment()}
        {page === 'parent-community' && renderParentCommunity()}
        {page === 'new-topic' && renderNewTopic()}
        {page === 'topic-detail' && renderTopicDetail()}
        {page === 'challenge' && renderChallenge()}
        <Modal open={!!modal} onCancel={() => setModal(null)} footer={null} destroyOnClose title={
          modal === 'player' ? '小将注册' :
          modal === 'coach' ? '教练入驻' :
          modal === 'login' ? '登录' : ''
        }>
          {renderModalContent()}
        </Modal>
      </Content>
    </Layout>
  );
}

export default App;
