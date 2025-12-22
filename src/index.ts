import { startScheduler } from './scheduler/scheduler';

console.log('========================================');
console.log('  JCC 점심 메뉴 크롤러');
console.log('========================================');
console.log('');

// 스케줄러 시작
startScheduler();

// 프로세스 유지
console.log('프로그램이 실행 중입니다. 종료하려면 Ctrl+C를 누르세요.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 프로그램을 종료합니다...');
  process.exit(0);
});
