String fileSize(String fileSize) {
  double x = double.parse(fileSize);

  return x > 1
      ? "${x.toStringAsFixed(1)}MB"
      : "${(x * 1000).toStringAsFixed(1)}KB";
}
