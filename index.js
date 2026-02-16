const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment variables (set these in Railway)
const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_1MIN = process.env.DISCORD_WEBHOOK_1MIN;
const DISCORD_WEBHOOK_15MIN = process.env.DISCORD_WEBHOOK_15MIN;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'MNQ Strat Webhook Server Running',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for 1-minute timeframe
app.post('/webhook/1min', async (req, res) => {
  console.log('📨 1min webhook received:', JSON.stringify(req.body, null, 2));
  
  try {
    const data = req.body;
    
    // Format Discord message based on signal type
    let discordMessage;
    
    if (data.signal === 'BUY' || data.signal === 'SELL') {
      // Entry signal
      const color = data.signal === 'BUY' ? 3066993 : 15158332; // Green or Red
      const emoji = data.signal === 'BUY' ? '🚀' : '🔻';
      
      discordMessage = {
        embeds: [{
          title: `${emoji} ${data.signal} SIGNAL - MNQ 1min`,
          color: color,
          fields: [
            {
              name: '📊 Entry Price',
              value: data.entry,
              inline: true
            },
            {
              name: '🎯 TP1',
              value: data.tp1,
              inline: true
            },
            {
              name: '🎯 TP2',
              value: data.tp2,
              inline: true
            },
            {
              name: '🛑 Stop Loss',
              value: data.sl,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Alignment',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '📊 Volume Ratio',
              value: `${data.volume_ratio}x`,
              inline: true
            },
            {
              name: '⏰ Time',
              value: data.time || new Date().toISOString(),
              inline: true
            }
          ],
          footer: {
            text: '1-Minute Timeframe'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (data.event === 'TP1') {
      // TP1 Hit - partial profit alert
      discordMessage = {
        embeds: [{
          title: `🎯 TP1 HIT - MNQ 1min`,
          color: 3066993, // Green
          description: `**Status:** ${data.result}`,
          fields: [
            {
              name: '💰 P&L (so far)',
              value: `${data.pnl_ticks} ticks`,
              inline: true
            },
            {
              name: '⏱️ Duration',
              value: `${data.duration_bars} bars`,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Align',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '📈 Avg/Bar',
              value: `${data.avg_per_bar} ticks`,
              inline: true
            }
          ],
          footer: {
            text: '1-Minute Timeframe • Now targeting TP2'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (data.event === 'EXIT') {
      // Exit signal
      const isProfit = parseFloat(data.pnl_ticks) > 0;
      const color = isProfit ? 3066993 : 15158332; // Green if profit, Red if loss
      
      let resultEmoji = '📊';
      if (data.result.includes('TP2')) resultEmoji = '🎯🎯';
      else if (data.result.includes('TP1')) resultEmoji = '🎯';
      else if (data.result.includes('SL')) resultEmoji = '🛑';
      else if (data.result.includes('Auto-closed')) resultEmoji = '🔄';
      
      discordMessage = {
        embeds: [{
          title: `${resultEmoji} TRADE CLOSED - MNQ 1min`,
          color: color,
          description: `**Result:** ${data.result}`,
          fields: [
            {
              name: '💰 P&L',
              value: `${data.pnl_ticks} ticks`,
              inline: true
            },
            {
              name: '⏱️ Duration',
              value: `${data.duration_bars} bars`,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '📊 Max Profit',
              value: `${data.max_profit_ticks} ticks`,
              inline: true
            },
            {
              name: '📉 Max Drawdown',
              value: `${data.max_dd_ticks} ticks`,
              inline: true
            },
            {
              name: '📈 Avg/Bar',
              value: `${data.avg_per_bar} ticks`,
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Align',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '🎯 TP1',
              value: data.tp1_hit === 'true' ? `✅ Hit @ ${data.tp1_bars} bars` : '❌ Not Hit',
              inline: true
            }
          ],
          footer: {
            text: '1-Minute Timeframe'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else {
      // Fallback for unknown format
      discordMessage = {
        content: `📨 **Alert from MNQ 1min:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
      };
    }
    
    // Send to Discord
    if (DISCORD_WEBHOOK_1MIN) {
      await axios.post(DISCORD_WEBHOOK_1MIN, discordMessage);
      console.log('✅ Message sent to Discord (1min)');
    } else {
      console.warn('⚠️ DISCORD_WEBHOOK_1MIN not configured');
    }
    
    res.status(200).json({ success: true, message: 'Alert processed' });
  } catch (error) {
    console.error('❌ Error processing 1min webhook:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook endpoint for 15-minute timeframe
app.post('/webhook/15min', async (req, res) => {
  console.log('📨 15min webhook received:', JSON.stringify(req.body, null, 2));
  
  try {
    const data = req.body;
    
    // Format Discord message based on signal type
    let discordMessage;
    
    if (data.signal === 'BUY' || data.signal === 'SELL') {
      // Entry signal
      const color = data.signal === 'BUY' ? 3066993 : 15158332; // Green or Red
      const emoji = data.signal === 'BUY' ? '🚀' : '🔻';
      
      discordMessage = {
        embeds: [{
          title: `${emoji} ${data.signal} SIGNAL - MNQ 15min`,
          color: color,
          fields: [
            {
              name: '📊 Entry Price',
              value: data.entry,
              inline: true
            },
            {
              name: '🎯 TP1',
              value: data.tp1,
              inline: true
            },
            {
              name: '🎯 TP2',
              value: data.tp2,
              inline: true
            },
            {
              name: '🛑 Stop Loss',
              value: data.sl,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Alignment',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '📊 Volume Ratio',
              value: `${data.volume_ratio}x`,
              inline: true
            },
            {
              name: '⏰ Time',
              value: data.time || new Date().toISOString(),
              inline: true
            }
          ],
          footer: {
            text: '15-Minute Timeframe'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (data.event === 'TP1') {
      // TP1 Hit - partial profit alert
      discordMessage = {
        embeds: [{
          title: `🎯 TP1 HIT - MNQ 15min`,
          color: 3066993, // Green
          description: `**Status:** ${data.result}`,
          fields: [
            {
              name: '💰 P&L (so far)',
              value: `${data.pnl_ticks} ticks`,
              inline: true
            },
            {
              name: '⏱️ Duration',
              value: `${data.duration_bars} bars`,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Align',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '📈 Avg/Bar',
              value: `${data.avg_per_bar} ticks`,
              inline: true
            }
          ],
          footer: {
            text: '15-Minute Timeframe • Now targeting TP2'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (data.event === 'EXIT') {
      // Exit signal
      const isProfit = parseFloat(data.pnl_ticks) > 0;
      const color = isProfit ? 3066993 : 15158332; // Green if profit, Red if loss
      
      let resultEmoji = '📊';
      if (data.result.includes('TP2')) resultEmoji = '🎯🎯';
      else if (data.result.includes('TP1')) resultEmoji = '🎯';
      else if (data.result.includes('SL')) resultEmoji = '🛑';
      else if (data.result.includes('Auto-closed')) resultEmoji = '🔄';
      
      discordMessage = {
        embeds: [{
          title: `${resultEmoji} TRADE CLOSED - MNQ 15min`,
          color: color,
          description: `**Result:** ${data.result}`,
          fields: [
            {
              name: '💰 P&L',
              value: `${data.pnl_ticks} ticks`,
              inline: true
            },
            {
              name: '⏱️ Duration',
              value: `${data.duration_bars} bars`,
              inline: true
            },
            {
              name: '📈 Pattern',
              value: data.type || 'N/A',
              inline: true
            },
            {
              name: '📊 Max Profit',
              value: `${data.max_profit_ticks} ticks`,
              inline: true
            },
            {
              name: '📉 Max Drawdown',
              value: `${data.max_dd_ticks} ticks`,
              inline: true
            },
            {
              name: '📈 Avg/Bar',
              value: `${data.avg_per_bar} ticks`,
              inline: true
            },
            {
              name: '⭐ Confidence',
              value: `${data.confidence}/5`,
              inline: true
            },
            {
              name: '🔄 MTF Align',
              value: `${data.mtf_align}/3`,
              inline: true
            },
            {
              name: '🎯 TP1',
              value: data.tp1_hit === 'true' ? `✅ Hit @ ${data.tp1_bars} bars` : '❌ Not Hit',
              inline: true
            }
          ],
          footer: {
            text: '15-Minute Timeframe'
          },
          timestamp: new Date().toISOString()
        }]
      };
    } else {
      // Fallback for unknown format
      discordMessage = {
        content: `📨 **Alert from MNQ 15min:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
      };
    }
    
    // Send to Discord
    if (DISCORD_WEBHOOK_15MIN) {
      await axios.post(DISCORD_WEBHOOK_15MIN, discordMessage);
      console.log('✅ Message sent to Discord (15min)');
    } else {
      console.warn('⚠️ DISCORD_WEBHOOK_15MIN not configured');
    }
    
    res.status(200).json({ success: true, message: 'Alert processed' });
  } catch (error) {
    console.error('❌ Error processing 15min webhook:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint - useful for checking if server is working
app.post('/test', (req, res) => {
  console.log('Test request received:', req.body);
  res.json({ success: true, received: req.body });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MNQ Strat Webhook Server running on port ${PORT}`);
  console.log(`📡 1min endpoint: /webhook/1min`);
  console.log(`📡 15min endpoint: /webhook/15min`);
  console.log(`✅ Health check: /`);
});
