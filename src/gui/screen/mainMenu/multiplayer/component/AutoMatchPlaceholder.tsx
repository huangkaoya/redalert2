import React from 'react';

export class AutoMatchPlaceholder extends React.Component {
  render() {
    return (
      <div className="mp-form">
        <div className="mp-connect-panel">
          <div className="mp-section-title">自动匹配</div>
          <div className="mp-placeholder-content">
            <div className="mp-placeholder-icon">&#9203;</div>
            <div className="mp-placeholder-message">功能开发中</div>
            <div className="mp-placeholder-desc">
              自动匹配功能将根据玩家水平和网络状况自动寻找对手，实现快速、公平的对战体验。
            </div>
            <div className="mp-placeholder-features">
              <div className="mp-section-title">计划支持的功能</div>
              <ul>
                <li>基于Elo评分的排位匹配</li>
                <li>1v1 / 2v2 / 3v3 / 4v4 多种模式</li>
                <li>自动选择最优服务器节点</li>
                <li>反作弊与公平性保障</li>
                <li>赛季排行榜</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
