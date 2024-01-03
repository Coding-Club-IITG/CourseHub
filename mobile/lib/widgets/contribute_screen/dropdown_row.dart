import 'package:coursehub/utilities/helpers/helpers.dart';
import 'package:dropdown_search/dropdown_search.dart';
import 'package:flutter/material.dart';

import '../../constants/all_courses.dart';
import '../../constants/themes.dart';
import '../../constants/years_sections.dart';


class DropdownRow extends StatefulWidget {
  final String label;
  final Function(dynamic params) callback;
  const DropdownRow({super.key, required this.label, required this.callback});

  @override
  State<DropdownRow> createState() => _DropdownRowState();
}

class _DropdownRowState extends State<DropdownRow> {
  var _value = 0;

  @override
  Widget build(BuildContext context) {
    List<DropdownMenuItem> items = [];
    if (widget.label == 'YEAR') {
      for (var i = 0; i < year.length; i++) {
        items.add(DropdownMenuItem(
          value: i,
          child: Text(year[i]),
        ));
      }
    } else if (widget.label == 'SECTION') {
      for (var i = 0; i < sections.length; i++) {
        items.add(DropdownMenuItem(
          value: i,
          child: Text(sections[i]),
        ));
      }
    }
    List<String> availCourses = courses
        .map((e) =>
            '${(e['code'] ?? '').toUpperCase()} - ${letterCapitalizer(e['name'] ?? '')}')
        .toList();

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          flex: 2,
          child: Text(
            widget.label,
            style: Themes.darkTextTheme.bodyLarge,
          ),
        ),
        Visibility(
          visible: widget.label!= 'COURSE',
          child: Expanded(
              flex: 6,
              child: DropdownButtonFormField(
                decoration: const InputDecoration(
                
                  contentPadding:
                      EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                  hintText: 'Describe you content...',
                  
                  hintStyle: TextStyle(
                    color: Color.fromRGBO(140, 142, 151, 1),
                    fontWeight: FontWeight.w500,
                    height: 0.1,
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
                onChanged: (a) {
                  setState(() {
                    _value = a ?? _value;
                  });
                  widget.callback(a);
                },
                value: _value,
                items: items,
              )),
        ),
        Visibility(
            visible: widget.label == 'COURSE',
            child: Expanded(
                flex: 6,
                child: DropdownSearch<String>(
                  validator: (value) {
                    if (value == null) {
                      return 'Select A Course';
                    } else {
                      return null;
                    }
                  },
                  popupProps: const PopupProps.menu(
                    showSearchBox: true,
                    searchFieldProps: TextFieldProps(
                      cursorColor: Colors.grey,
                      decoration: InputDecoration(
                        contentPadding:
                            EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                        hintText: 'Search by code or name',
                        hintStyle: TextStyle(
                          color: Color.fromRGBO(140, 142, 151, 1),
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
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
                    ),
                    listViewProps: ListViewProps(
                      cacheExtent: 10,
                      physics: BouncingScrollPhysics(),
                    ),
                  ),
                  items: availCourses,
                  dropdownDecoratorProps: const DropDownDecoratorProps(
                    baseStyle: TextStyle(
                      overflow: TextOverflow.ellipsis,
                      color: Colors.black,
                      fontWeight: FontWeight.w400,
                    ),
                    dropdownSearchDecoration: InputDecoration(
                      suffixIconColor: Color.fromRGBO(80, 80, 80, 1),
                      contentPadding:
                          EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                      hintText: 'Select a Course',
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
                  ),
                  onChanged: (str) {
                    String s = str ?? '';
                    widget.callback(s.split('-')[0].trim());
                  },
                )))
      ],
    );
  }
}
