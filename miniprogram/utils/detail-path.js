/**
 * 详情页跳转路径。
 *
 * 详情数据按章节拆到了两个分包（packageDetail / packageDetail2），
 * 因为单个分包上限 2MB，765 条详情（约 2.3MB）放不进一个包。
 * 跳转时必须按条目所在章节选择对应分包的页面路径。
 *
 * 切分点 SPLIT_CHAPTER 必须与 miniprogram/scripts/gen_data.py 的同名常量一致。
 */
const SPLIT_CHAPTER = 11;

// 第 1..SPLIT_CHAPTER 章在 packageDetail，其余在 packageDetail2
function detailRoot(ch) {
  return Number(ch) > SPLIT_CHAPTER ? 'packageDetail2' : 'packageDetail';
}

function detailPath(ch) {
  return `/${detailRoot(ch)}/pages/detail/detail`;
}

function detailUrl(id, ch) {
  return `${detailPath(ch)}?id=${id}`;
}

module.exports = { SPLIT_CHAPTER, detailRoot, detailPath, detailUrl };
