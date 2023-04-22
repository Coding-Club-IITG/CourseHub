import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/widgets/contribute_screen/upload.dart';
import 'package:flutter/material.dart';

class FeedBackScreen extends StatelessWidget {
  final _controller = TextEditingController();
  FeedBackScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // const NavBar()
          Text(
            'Describe your Feedback',
            style: Themes.darkTextTheme.labelLarge,
          ),
          const SizedBox(
            height: 10,
          ),
          TextField(
            textInputAction: TextInputAction.next,
            controller: _controller,
            maxLines: 6,
            keyboardType: TextInputType.text,
            cursorColor: const Color.fromRGBO(140, 142, 151, 1),
            decoration: const InputDecoration(
              contentPadding:
                  EdgeInsets.only(top: 20, left: 20, right: 5, bottom: 5),
              hintText:
                  'Have something to say about CourseHub? This is the place to do it. \nYour feedback is crucial to making CourseHub the best it can be.',
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
          const SizedBox(
            height: 20,
          ),
          Text(
            'Screenshots (Optional)',
            style: Themes.darkTextTheme.labelLarge,
          ),
          const SizedBox(
            height: 10,
          ),

          Expanded(
            flex: 2,
            child: Upload(
              callback: (callback) {},
              color: Colors.black,
            ),
          ),
          
          const Spacer(
            flex: 5,
          )
        ],
      ),
    );
  }
}
