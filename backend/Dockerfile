FROM public.ecr.aws/lambda/python:3.9

# Copy requirements file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py ${LAMBDA_TASK_ROOT}
COPY lambda_adapter.py ${LAMBDA_TASK_ROOT}

# Set the handler
CMD [ "lambda_adapter.lambda_handler" ]