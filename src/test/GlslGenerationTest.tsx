import React, { useState, useRef } from 'react';
import { MixFile } from '../data/MixFile';
import { DataStream } from '../data/DataStream';
import { ShpFile } from '../data/ShpFile';
import { Palette } from '../data/Palette';
import { ImageUtils } from '../engine/gfx/ImageUtils';
interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}
export const GlslGenerationTest: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
        console.log(`[${type.toUpperCase()}] ${message}`);
    };
    const clearLogs = () => {
        setLogs([]);
        setGeneratedImageUrl(null);
    };
    const testGlslGeneration = async () => {
        setIsLoading(true);
        clearLogs();
        try {
            addLog('开始 GLSL.PNG 生成测试', 'info');
            let ra2MixData: ArrayBuffer;
            if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
                addLog('从选择的文件加载 ra2.mix', 'info');
                ra2MixData = await fileInputRef.current.files[0].arrayBuffer();
            }
            else {
                addLog('尝试从 public 目录加载 ra2.mix', 'info');
                try {
                    const response = await fetch('/ra2.mix');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    ra2MixData = await response.arrayBuffer();
                }
                catch (error) {
                    addLog(`无法从 public 目录加载 ra2.mix: ${(error as Error).message}`, 'error');
                    addLog('请选择一个 ra2.mix 文件', 'warning');
                    return;
                }
            }
            addLog(`ra2.mix 文件大小: ${ra2MixData.byteLength} bytes`, 'success');
            addLog('解析 ra2.mix...', 'info');
            const ra2MixStream = new DataStream(ra2MixData);
            const ra2Mix = new MixFile(ra2MixStream);
            addLog('✓ ra2.mix 解析成功', 'success');
            addLog('检查 local.mix...', 'info');
            if (!ra2Mix.containsFile('local.mix')) {
                addLog('✗ ra2.mix 中未找到 local.mix', 'error');
                return;
            }
            addLog('✓ 找到 local.mix', 'success');
            addLog('打开 local.mix...', 'info');
            const localMixFile = ra2Mix.openFile('local.mix');
            const localMix = new MixFile(localMixFile.stream);
            addLog(`✓ local.mix 解析成功，文件大小: ${localMixFile.getSize()} bytes`, 'success');
            addLog('检查必要文件...', 'info');
            const hasGlslShp = localMix.containsFile('glsl.shp');
            const hasGlsPal = localMix.containsFile('gls.pal');
            addLog(`glsl.shp 存在: ${hasGlslShp}`, hasGlslShp ? 'success' : 'error');
            addLog(`gls.pal 存在: ${hasGlsPal}`, hasGlsPal ? 'success' : 'error');
            if (!hasGlslShp || !hasGlsPal) {
                addLog('✗ 缺少必要文件，无法生成 glsl.png', 'error');
                return;
            }
            addLog('提取 glsl.shp 和 gls.pal...', 'info');
            const glslShpFile = localMix.openFile('glsl.shp');
            const glsPalFile = localMix.openFile('gls.pal');
            addLog(`✓ glsl.shp 大小: ${glslShpFile.getSize()} bytes`, 'success');
            addLog(`✓ gls.pal 大小: ${glsPalFile.getSize()} bytes`, 'success');
            addLog('解析 SHP 文件和调色板...', 'info');
            const shpFile = new ShpFile(glslShpFile);
            const palette = new Palette(glsPalFile);
            addLog(`✓ SHP 解析成功:`, 'success');
            addLog(`  - 宽度: ${shpFile.width}`, 'info');
            addLog(`  - 高度: ${shpFile.height}`, 'info');
            addLog(`  - 图像数量: ${shpFile.numImages}`, 'info');
            addLog(`✓ 调色板解析成功，颜色数量: ${palette.size}`, 'success');
            addLog('开始转换 SHP 为 PNG...', 'info');
            const pngBlob = await ImageUtils.convertShpToPng(shpFile, palette);
            addLog(`✅ PNG 转换成功!`, 'success');
            addLog(`PNG 文件大小: ${pngBlob.size} bytes`, 'success');
            addLog(`PNG 文件类型: ${pngBlob.type}`, 'success');
            const url = URL.createObjectURL(pngBlob);
            setGeneratedImageUrl(url);
            addLog('🎉 GLSL.PNG 生成完成！请查看下方预览', 'success');
        }
        catch (error) {
            addLog(`❌ 生成过程中出错: ${(error as Error).message}`, 'error');
            console.error('详细错误信息:', error);
            if ((error as Error).stack) {
                addLog(`错误堆栈: ${(error as Error).stack}`, 'error');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'warning': return '#ffc107';
            default: return '#007bff';
        }
    };
    return (<div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
      <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
        <h1>GLSL.PNG 生成测试</h1>
        
        <div style={{
            margin: '20px 0',
            padding: '20px',
            border: '2px dashed #ccc',
            borderRadius: '4px',
            textAlign: 'center'
        }}>
          <p>请选择 ra2.mix 文件:</p>
          <input ref={fileInputRef} type="file" accept=".mix" style={{ margin: '10px 0' }}/>
          <p><small>或者确保 ra2.mix 文件在 public 目录下</small></p>
        </div>
        
        <div style={{ margin: '20px 0' }}>
          <button onClick={testGlslGeneration} disabled={isLoading} style={{
            background: isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            margin: '5px'
        }}>
            {isLoading ? '测试中...' : '开始测试 GLSL.PNG 生成'}
          </button>
          
          <button onClick={clearLogs} style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            margin: '5px'
        }}>
            清空日志
          </button>
        </div>
        
        <div style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '15px',
            margin: '10px 0',
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            maxHeight: '400px',
            overflowY: 'auto'
        }}>
          {logs.length === 0 ? (<div style={{ color: '#6c757d' }}>等待开始测试...</div>) : (logs.map((log, index) => (<div key={index} style={{ color: getLogColor(log.type) }}>
                [{log.timestamp}] {log.message}
              </div>)))}
        </div>
        
        {generatedImageUrl && (<div style={{ margin: '20px 0', textAlign: 'center' }}>
            <h3>生成的 GLSL.PNG 预览:</h3>
            <img src={generatedImageUrl} alt="Generated GLSL.PNG" style={{
                maxWidth: '100%',
                maxHeight: '400px',
                border: '1px solid #ddd',
                borderRadius: '4px'
            }}/>
            <br />
            <a href={generatedImageUrl} download="glsl.png">
              <button style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                margin: '10px'
            }}>
                下载 GLSL.PNG
              </button>
            </a>
          </div>)}
      </div>
    </div>);
};
