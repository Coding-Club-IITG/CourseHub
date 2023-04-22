import 'package:flutter/material.dart';

import '../../utilities/validation.dart';

class CustomTextformfield extends StatelessWidget {
  final TextEditingController controller;

  const CustomTextformfield({
    super.key,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      textInputAction: TextInputAction.next,
      controller: controller,
      maxLines: 3,
      keyboardType: TextInputType.text,
      validator: descriptionValidator,
      cursorColor: const Color.fromRGBO(140, 142, 151, 1),
      decoration: const InputDecoration(
        contentPadding: EdgeInsets.only(top: 20, left: 20, right: 5, bottom: 5),
        hintText: 'Describe you content...',
        hintStyle: TextStyle(
          color: Color.fromRGBO(140, 142, 151, 1),
          fontWeight: FontWeight.w500,
          fontSize: 14,
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(0)),
          borderSide: BorderSide(
            color: Colors.red,
            width: 1,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(0)),
          borderSide: BorderSide(
            color: Colors.red,
            width: 1,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(0)),
          borderSide: BorderSide(
            color: Color.fromRGBO(80, 80, 80, 1),
            width: 1,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(0)),
          borderSide: BorderSide(
            color: Color.fromRGBO(160, 160, 160, 1),
            width: 1,
          ),
        ),
      ),
    );
  }
}
