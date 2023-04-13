String? descriptionValidator(String? description) {
  if (description!.isEmpty) {
    return 'Please Enter a Description';
  } else {
    return null;
  }
}
