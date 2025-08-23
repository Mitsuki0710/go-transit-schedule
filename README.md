# Go Transit Schedule Widget

这是一个用于Scriptable的Go Transit时刻表小部件，支持不同大小的widget和智能trip显示。

## 主要功能

### 1. 智能Trip显示
- **永远fetch 6个trip**：确保有足够的trip数据供选择
- **根据widget大小智能显示**：
  - **大widget**：显示4个trip
  - **中widget**：显示4个trip  
  - **小widget**：显示2个trip

### 2. Transfer Trip支持
- **可配置显示**：通过`showTransfers`参数控制是否显示transfer trip
- **智能分配**：
  - 如果启用transfer trip显示：
    - 大/中widget：显示1个transfer trip + 3个direct trip
    - 小widget：显示1个transfer trip + 1个direct trip
  - 如果禁用transfer trip显示：只显示direct trip

### 3. 配置选项

在`gotransit-config.json`文件中配置：

```json
{
  "departure": "Union Station GO",
  "arrival": "Unionville GO", 
  "showTransfers": false,
  "travelMode": "All",
  "colors": {
    "title": "#000000",
    "stationInfo": "#0066CC",
    "timeText": "#333333",
    "duration": "#666666",
    "transferRoute": "#FF6B00",
    "directRoute": "#008E44",
    "stationDetails": "#707070",
    "separator": "#CCCCCC"
  }
}
```

#### 配置参数说明：
- `departure`: 出发站名
- `arrival`: 到达站名
- `showTransfers`: 是否显示transfer trip（默认false）
- `travelMode`: 交通模式（"All", "1"=火车, "2"=巴士）
- `colors`: 自定义颜色主题

### 4. 移除的功能
- **Return Trip**: 已完全移除，不再支持往返行程显示

## 使用方法

1. 将`go-transit-openai-2 copy.js`文件复制到Scriptable
2. 创建配置文件`gotransit-config.json`并放置在Scriptable的Documents目录
3. 运行脚本创建widget
4. 根据设备支持的widget大小，自动调整显示内容

## 注意事项

- 脚本会自动获取当前时间前30分钟开始的trip
- 优先显示direct trip，然后是transfer trip
- 所有trip按出发时间排序
- 支持自定义颜色主题